package com.app.taskmanagement.service;

import com.app.taskmanagement.dto.*;
import com.app.taskmanagement.exception.*;
import com.app.taskmanagement.model.EmailVerification;
import com.app.taskmanagement.model.RefreshToken;
import com.app.taskmanagement.model.User;
import com.app.taskmanagement.repository.EmailVerificationRepository;
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

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final EmailVerificationRepository emailVerificationRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;
    private final RefreshTokenService refreshTokenService;

    @Value("${otp.expiration}")
    private Long otpExpiration;

    @Value("${jwt.access-token-expiration}")
    private Long accessTokenExpiration;

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
        log.info("User registered successfully: {}", user.getEmail());

        // Send OTP
        sendVerificationOtp(request.getEmail());
    }

    @Transactional
    public void sendVerificationOtp(String email) {
        // Rate limiting: max 3 OTPs per 15 minutes
        LocalDateTime fifteenMinutesAgo = LocalDateTime.now().minusMinutes(15);
        long recentAttempts = emailVerificationRepository.countRecentAttempts(email, fifteenMinutesAgo);

        if (recentAttempts >= 3) {
            throw new AuthException("Too many OTP requests. Please try again later.");
        }

        // Invalidate old OTPs
        emailVerificationRepository.markAllAsUsedByEmail(email);

        // Create new OTP
        EmailVerification verification = EmailVerification.builder()
                .email(email)
                .expiresAt(LocalDateTime.now().plusSeconds(otpExpiration / 1000))
                .build();

        emailVerificationRepository.save(verification);

        // Send email
        emailService.sendOtpEmail(email, verification.getOtpCode());
        log.info("OTP sent to: {}", email);
    }

    @Transactional
    public void verifyEmail(VerifyOtpRequest request) {
        EmailVerification verification = emailVerificationRepository
                .findValidOtpByEmailAndCode(request.getEmail(), request.getOtp())
                .orElseThrow(InvalidOtpException::new);

        // Check if valid
        if (!verification.isValid()) {
            throw new InvalidOtpException();
        }

        // Mark as used
        verification.markAsUsed();
        emailVerificationRepository.save(verification);

        // Update user
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(UserNotFoundException::new);

        user.setEmailVerified(true);
        userRepository.save(user);

        // Send welcome email
        emailService.sendWelcomeEmail(user.getEmail(), user.getFullName());

        log.info("Email verified successfully: {}", user.getEmail());
    }

    @Transactional
    public AuthResponse login(LoginRequest request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
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
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user, httpRequest);

        // Set refresh token in cookie
        setRefreshTokenCookie(httpResponse, refreshToken.getToken());

        log.info("User logged in successfully: {}", user.getEmail());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .tokenType("Bearer")
                .expiresIn(accessTokenExpiration / 1000)
                .user(mapToUserDto(user))
                .build();
    }

    @Transactional
    public AuthResponse refreshAccessToken(HttpServletRequest request, HttpServletResponse response) {
        // Get refresh token from cookie
        String refreshTokenValue = extractRefreshTokenFromCookie(request);
        if (refreshTokenValue == null) {
            throw new InvalidTokenException();
        }

        // Validate refresh token
        RefreshToken refreshToken = refreshTokenService.findByToken(refreshTokenValue)
                .orElseThrow(InvalidTokenException::new);

        if (!refreshToken.isValid()) {
            throw new InvalidTokenException();
        }

        User user = refreshToken.getUser();

        // Check if user is still active
        if (!user.getIsActive()) {
            throw new AccountDisabledException();
        }

        // Rotate refresh token
        RefreshToken newRefreshToken = refreshTokenService.rotateRefreshToken(refreshToken, request);

        // Generate new access token
        String newAccessToken = jwtUtil.generateAccessToken(user);

        // Set new refresh token in cookie
        setRefreshTokenCookie(response, newRefreshToken.getToken());

        log.info("Access token refreshed for user: {}", user.getEmail());

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .tokenType("Bearer")
                .expiresIn(accessTokenExpiration / 1000)
                .user(mapToUserDto(user))
                .build();
    }

    @Transactional
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        String refreshTokenValue = extractRefreshTokenFromCookie(request);

        if (refreshTokenValue != null) {
            refreshTokenService.revokeToken(refreshTokenValue);
        }

        // Clear cookie
        clearRefreshTokenCookie(response);

        log.info("User logged out successfully");
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

    private String extractRefreshTokenFromCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if ("refreshToken".equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        return null;
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