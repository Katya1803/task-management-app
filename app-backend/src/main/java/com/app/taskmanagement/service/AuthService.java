package com.app.taskmanagement.service;

import com.app.taskmanagement.constant.ErrorCode;
import com.app.taskmanagement.constant.SecurityConstants;
import com.app.taskmanagement.dto.request.LoginRequest;
import com.app.taskmanagement.dto.request.RegisterRequest;
import com.app.taskmanagement.dto.request.VerifyOtpRequest;
import com.app.taskmanagement.dto.response.AuthResponse;
import com.app.taskmanagement.dto.response.UserDto;
import com.app.taskmanagement.exception.ApplicationException;
import com.app.taskmanagement.mapper.AuthMapper;
import com.app.taskmanagement.mapper.UserMapper;
import com.app.taskmanagement.model.User;
import com.app.taskmanagement.repository.UserRepository;
import com.app.taskmanagement.security.JwtUtil;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;
    private final OtpRedisService otpRedisService;
    private final RefreshTokenRedisService refreshTokenRedisService;
    private final UserMapper userMapper;
    private final AuthMapper authMapper;

    @Value("${jwt.access-token-expiration}")
    private Long accessTokenExpiration;

    @Transactional
    public void register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ApplicationException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .role(User.Role.USER)
                .authProvider(User.AuthProvider.LOCAL)
                .emailVerified(false)
                .isActive(true)
                .mfaEnabled(false)
                .build();

        userRepository.save(user);
        log.info("User registered: {}", user.getEmail());

        sendVerificationOtp(request.getEmail());
    }

    @Transactional
    public void sendVerificationOtp(String email) {
        try {
            String otp = otpRedisService.generateAndSaveOtp(email);
            emailService.sendOtpEmail(email, otp);
            log.info("OTP sent to: {}", email);
        } catch (ApplicationException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to send OTP: {}", email, e);
            throw new ApplicationException(ErrorCode.EMAIL_SEND_FAILED);
        }
    }

    @Transactional
    public void verifyEmail(VerifyOtpRequest request) {
        boolean isValid = otpRedisService.verifyOtp(request.getEmail(), request.getOtp());

        if (!isValid) {
            throw new ApplicationException(ErrorCode.INVALID_OTP);
        }

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ApplicationException(ErrorCode.USER_NOT_FOUND));

        user.setEmailVerified(true);
        userRepository.save(user);

        emailService.sendWelcomeEmail(user.getEmail(), user.getFullName());
        log.info("Email verified successfully: {}", user.getEmail());
    }

    @Transactional
    public AuthResponse login(LoginRequest request,
                              HttpServletRequest httpRequest,
                              HttpServletResponse httpResponse) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ApplicationException(ErrorCode.INVALID_CREDENTIALS));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new ApplicationException(ErrorCode.INVALID_CREDENTIALS);
        }

        if (!user.getEmailVerified()) {
            throw new ApplicationException(ErrorCode.EMAIL_NOT_VERIFIED);
        }

        if (!user.getIsActive()) {
            throw new ApplicationException(ErrorCode.ACCOUNT_DISABLED);
        }

        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        String accessToken = jwtUtil.generateAccessToken(user);
        String refreshToken = refreshTokenRedisService.createRefreshToken(user, httpRequest);

        setRefreshTokenCookie(httpResponse, refreshToken);

        UserDto userDto = userMapper.toDto(user);
        log.info("User logged in: {}", user.getEmail());

        return authMapper.toAuthResponse(accessToken, accessTokenExpiration, userDto);
    }

    @Transactional
    public AuthResponse refreshAccessToken(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = extractRefreshTokenFromCookie(request);

        if (refreshToken == null) {
            throw new ApplicationException(ErrorCode.INVALID_TOKEN);
        }

        Map<String, Object> tokenData = refreshTokenRedisService.getRefreshTokenData(refreshToken);

        if (tokenData == null) {
            throw new ApplicationException(ErrorCode.INVALID_TOKEN);
        }

        String currentDeviceId = extractDeviceId(request);
        String savedDeviceId = (String) tokenData.get("deviceId");

        if (!currentDeviceId.equals(savedDeviceId)) {
            refreshTokenRedisService.revokeToken(refreshToken);
            log.warn("Device mismatch detected. Token revoked. Saved: {}, Current: {}",
                    savedDeviceId, currentDeviceId);
            throw new ApplicationException(ErrorCode.INVALID_TOKEN);
        }

        Object userIdObj = tokenData.get("userId");
        if (userIdObj == null) {
            throw new ApplicationException(ErrorCode.INVALID_TOKEN);
        }

        Long userId = Long.valueOf(userIdObj.toString());
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApplicationException(ErrorCode.USER_NOT_FOUND));

        if (!user.getIsActive()) {
            throw new ApplicationException(ErrorCode.ACCOUNT_DISABLED);
        }

        refreshTokenRedisService.revokeToken(refreshToken);

        String newAccessToken = jwtUtil.generateAccessToken(user);
        String newRefreshToken = refreshTokenRedisService.createRefreshToken(user, request);

        setRefreshTokenCookie(response, newRefreshToken);

        UserDto userDto = userMapper.toDto(user);
        log.info("Access token refreshed for user: {}", user.getEmail());

        return authMapper.toAuthResponse(newAccessToken, accessTokenExpiration, userDto);
    }

    public void logout(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = extractRefreshTokenFromCookie(request);

        if (refreshToken != null) {
            refreshTokenRedisService.revokeToken(refreshToken);
        }

        clearRefreshTokenCookie(response);
        log.info("User logged out");
    }

    private void setRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
        ResponseCookie cookie = ResponseCookie.from(SecurityConstants.REFRESH_TOKEN_COOKIE, refreshToken)
                .httpOnly(true)
                .secure(true)
                .path(SecurityConstants.COOKIE_PATH)
                .maxAge(Duration.ofSeconds(SecurityConstants.COOKIE_MAX_AGE_SECONDS))
                .sameSite("Lax")
                .build();

        response.addHeader("Set-Cookie", cookie.toString());
    }

    private void clearRefreshTokenCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(SecurityConstants.REFRESH_TOKEN_COOKIE, "")
                .httpOnly(true)
                .secure(true)
                .path(SecurityConstants.COOKIE_PATH)
                .maxAge(0)
                .sameSite("Lax")
                .build();

        response.addHeader("Set-Cookie", cookie.toString());
    }

    private String extractRefreshTokenFromCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (SecurityConstants.REFRESH_TOKEN_COOKIE.equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }

    private String extractDeviceId(HttpServletRequest request) {
        String userAgent = request.getHeader("User-Agent");
        String ipAddress = request.getRemoteAddr();
        return (userAgent != null ? userAgent : "unknown") + "_" + (ipAddress != null ? ipAddress : "unknown");
    }
}