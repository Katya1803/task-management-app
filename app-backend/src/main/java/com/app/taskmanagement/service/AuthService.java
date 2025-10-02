// src/main/java/com/app/taskmanagement/service/AuthService.java
package com.app.taskmanagement.service;

import com.app.taskmanagement.dto.request.LoginRequest;
import com.app.taskmanagement.dto.request.RegisterRequest;
import com.app.taskmanagement.dto.request.VerifyOtpRequest;
import com.app.taskmanagement.dto.response.AuthResponse;
import com.app.taskmanagement.dto.response.UserDto;
import com.app.taskmanagement.exception.*;
import com.app.taskmanagement.model.User;
import com.app.taskmanagement.repository.UserRepository;
import com.app.taskmanagement.security.JwtUtil;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;

    // ✅ Redis services
    private final OtpRedisService otpRedisService;
    private final RefreshTokenRedisService refreshTokenRedisService;

    @Value("${jwt.access-token-expiration}")
    private Long accessTokenExpiration;

    // ==================== REGISTRATION ====================

    @Transactional
    public void register(RegisterRequest request) {
        // Check if email already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new EmailAlreadyExistsException(request.getEmail());
        }

        // Create user (not verified yet)
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
        log.info("✅ User registered: {}", user.getEmail());

        // Send OTP via Redis
        sendVerificationOtp(request.getEmail());
    }

    // ==================== OTP VERIFICATION ====================

    @Transactional
    public void sendVerificationOtp(String email) {
        try {
            // Generate and save OTP in Redis (with rate limiting)
            String otp = otpRedisService.generateAndSaveOtp(email);

            // Send email
            emailService.sendOtpEmail(email, otp);

            log.info("✅ OTP sent to: {}", email);
        } catch (Exception e) {
            log.error("❌ Failed to send OTP: {}", email, e);
            throw new RuntimeException("Failed to send verification code. " + e.getMessage());
        }
    }

    @Transactional
    public void verifyEmail(VerifyOtpRequest request) {
        // Verify OTP from Redis
        boolean isValid = otpRedisService.verifyOtp(request.getEmail(), request.getOtp());

        if (!isValid) {
            throw new InvalidOtpException();
        }

        // Update user
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(UserNotFoundException::new);

        user.setEmailVerified(true);
        userRepository.save(user);

        // Send welcome email
        emailService.sendWelcomeEmail(user.getEmail(), user.getFullName());

        log.info("✅ Email verified successfully: {}", user.getEmail());
    }

    // ==================== LOGIN ====================

    @Transactional
    public AuthResponse login(LoginRequest request,
                              HttpServletRequest httpRequest,
                              HttpServletResponse httpResponse) {
        // Find user
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(InvalidCredentialsException::new);

        // Verify password
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }

        // Check if email verified
        if (!user.getEmailVerified()) {
            throw new EmailNotVerifiedException();
        }

        // Check if active
        if (!user.getIsActive()) {
            throw new AccountDisabledException();
        }

        // Generate tokens
        String accessToken = jwtUtil.generateAccessToken(user);
        String refreshToken = refreshTokenRedisService.createRefreshToken(user, httpRequest);

        // Set refresh token in cookie
        setRefreshTokenCookie(httpResponse, refreshToken);

        log.info("✅ User logged in: {}", user.getEmail());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .tokenType("Bearer")
                .expiresIn(accessTokenExpiration / 1000)
                .user(mapToUserDto(user))
                .build();
    }

    // ==================== TOKEN REFRESH ====================

    @Transactional
    public AuthResponse refreshAccessToken(HttpServletRequest request,
                                           HttpServletResponse response) {
        // Get refresh token from cookie
        String refreshToken = extractRefreshTokenFromCookie(request);
        if (refreshToken == null) {
            throw new InvalidTokenException();
        }

        // Validate refresh token from Redis
        Long userId = refreshTokenRedisService.validateAndGetUserId(refreshToken);
        if (userId == null) {
            throw new InvalidTokenException();
        }

        // Load user
        User user = userRepository.findById(userId)
                .orElseThrow(UserNotFoundException::new);

        if (!user.getIsActive()) {
            throw new AccountDisabledException();
        }

        // Rotate refresh token
        String newRefreshToken = refreshTokenRedisService.rotateRefreshToken(
                refreshToken, user, request
        );

        // Generate new access token
        String newAccessToken = jwtUtil.generateAccessToken(user);

        // Set new refresh token in cookie
        setRefreshTokenCookie(response, newRefreshToken);

        log.info("✅ Tokens refreshed for user: {}", user.getEmail());

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .tokenType("Bearer")
                .expiresIn(accessTokenExpiration / 1000)
                .user(mapToUserDto(user))
                .build();
    }

    // ==================== LOGOUT ====================

    @Transactional
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = extractRefreshTokenFromCookie(request);

        if (refreshToken != null) {
            // Revoke refresh token from Redis
            refreshTokenRedisService.revokeToken(refreshToken);
        }

        // Clear cookie
        clearRefreshTokenCookie(response);

        log.info("✅ User logged out");
    }

    // ==================== HELPER METHODS ====================

    private String extractRefreshTokenFromCookie(HttpServletRequest request) {
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("refreshToken".equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }

    private void setRefreshTokenCookie(HttpServletResponse response, String token) {
        Cookie cookie = new Cookie("refreshToken", token);
        cookie.setHttpOnly(true);
        cookie.setSecure(false); // Set to true in production with HTTPS
        cookie.setPath("/");
        cookie.setMaxAge(7 * 24 * 60 * 60); // 7 days
        response.addCookie(cookie);
    }

    private void clearRefreshTokenCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie("refreshToken", null);
        cookie.setHttpOnly(true);
        cookie.setSecure(false);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
    }

    private UserDto mapToUserDto(User user) {
        return UserDto.builder()
                .publicId(user.getPublicId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .authProvider(user.getAuthProvider().name())
                .emailVerified(user.getEmailVerified())
                .build();
    }
}