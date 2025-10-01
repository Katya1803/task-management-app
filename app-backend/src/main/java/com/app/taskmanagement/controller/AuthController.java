package com.app.taskmanagement.controller;

import com.app.taskmanagement.dto.*;
import com.app.taskmanagement.service.AuthService;
import com.app.taskmanagement.service.OAuth2Service;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final OAuth2Service oauth2Service;

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(
                Map.of(
                        "status", "UP",
                        "service", "Authentication Service"
                )
        );
    }

    // ==================== LOCAL AUTHENTICATION ====================

    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(
                Map.of(
                        "message", "Registration successful. Please check your email for verification code.",
                        "email", request.getEmail()
                )
        );
    }

    @PostMapping("/verify-email")
    public ResponseEntity<Map<String, String>> verifyEmail(@Valid @RequestBody VerifyOtpRequest request) {
        authService.verifyEmail(request);
        return ResponseEntity.ok(
                Map.of("message", "Email verified successfully. You can now login.")
        );
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<Map<String, String>> resendOtp(@Valid @RequestBody ResendOtpRequest request) {
        authService.sendVerificationOtp(request.getEmail());
        return ResponseEntity.ok(
                Map.of(
                        "message", "Verification code sent successfully.",
                        "email", request.getEmail()
                )
        );
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        AuthResponse response = authService.login(request, httpRequest, httpResponse);
        return ResponseEntity.ok(response);
    }

    // ==================== OAUTH2 AUTHENTICATION ====================

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> loginWithGoogle(
            @Valid @RequestBody GoogleLoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        AuthResponse response = oauth2Service.loginWithGoogle(
                request.getIdToken(),
                httpRequest,
                httpResponse
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping("/facebook")
    public ResponseEntity<AuthResponse> loginWithFacebook(
            @Valid @RequestBody FacebookLoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        AuthResponse response = oauth2Service.loginWithFacebook(
                request.getAccessToken(),
                httpRequest,
                httpResponse
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping("/link-email")
    public ResponseEntity<AuthResponse> linkEmail(
            @Valid @RequestBody LinkEmailRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        AuthResponse response = oauth2Service.linkEmailToProvider(
                request.getProviderId(),
                request.getProvider(),
                request.getEmail(),
                httpRequest,
                httpResponse
        );
        return ResponseEntity.ok(response);
    }

    // ==================== TOKEN MANAGEMENT ====================

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        AuthResponse authResponse = authService.refreshAccessToken(request, response);
        return ResponseEntity.ok(authResponse);
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        authService.logout(request, response);
        return ResponseEntity.ok(
                Map.of("message", "Logged out successfully")
        );
    }
}