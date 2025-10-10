package com.app.taskmanagement.controller;

import com.app.taskmanagement.constant.ApiPath;
import com.app.taskmanagement.constant.MessageConstants;
import com.app.taskmanagement.dto.request.*;
import com.app.taskmanagement.dto.response.ApiResponse;
import com.app.taskmanagement.dto.response.AuthResponse;
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
@RequestMapping(ApiPath.Auth.BASE)
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final OAuth2Service oauth2Service;

    @GetMapping(ApiPath.Auth.HEALTH)
    public ResponseEntity<ApiResponse<Map<String, String>>> health() {
        Map<String, String> data = Map.of(
                "status", "UP",
                "service", "Authentication Service"
        );
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PostMapping(ApiPath.Auth.REGISTER)
    public ResponseEntity<ApiResponse<Map<String, String>>> register(
            @Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        Map<String, String> data = Map.of("email", request.getEmail());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(MessageConstants.REGISTRATION_SUCCESS, data));
    }

    @PostMapping(ApiPath.Auth.VERIFY_EMAIL)
    public ResponseEntity<ApiResponse<Void>> verifyEmail(
            @Valid @RequestBody VerifyOtpRequest request) {
        authService.verifyEmail(request);
        return ResponseEntity.ok(ApiResponse.success(MessageConstants.EMAIL_VERIFIED));
    }

    @PostMapping(ApiPath.Auth.RESEND_OTP)
    public ResponseEntity<ApiResponse<Map<String, String>>> resendOtp(
            @Valid @RequestBody ResendOtpRequest request) {
        authService.sendVerificationOtp(request.getEmail());
        Map<String, String> data = Map.of("email", request.getEmail());
        return ResponseEntity.ok(ApiResponse.success(MessageConstants.OTP_SENT, data));
    }

    @PostMapping(ApiPath.Auth.LOGIN)
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        AuthResponse authResponse = authService.login(request, httpRequest, httpResponse);
        return ResponseEntity.ok(ApiResponse.success(authResponse));
    }

    @PostMapping(ApiPath.Auth.GOOGLE)
    public ResponseEntity<ApiResponse<AuthResponse>> loginWithGoogle(
            @Valid @RequestBody GoogleLoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        AuthResponse authResponse = oauth2Service.loginWithGoogle(
                request.getIdToken(),
                httpRequest,
                httpResponse
        );
        return ResponseEntity.ok(ApiResponse.success(authResponse));
    }

    @PostMapping(ApiPath.Auth.FACEBOOK)
    public ResponseEntity<ApiResponse<AuthResponse>> loginWithFacebook(
            @Valid @RequestBody FacebookLoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        AuthResponse authResponse = oauth2Service.loginWithFacebook(
                request.getAccessToken(),
                httpRequest,
                httpResponse
        );
        return ResponseEntity.ok(ApiResponse.success(authResponse));
    }

    @PostMapping(ApiPath.Auth.REFRESH)
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(
            HttpServletRequest request,
            HttpServletResponse response) {
        AuthResponse authResponse = authService.refreshAccessToken(request, response);
        return ResponseEntity.ok(ApiResponse.success(authResponse));
    }

    @PostMapping(ApiPath.Auth.LOGOUT)
    public ResponseEntity<ApiResponse<Void>> logout(
            HttpServletRequest request,
            HttpServletResponse response) {
        authService.logout(request, response);
        return ResponseEntity.ok(ApiResponse.success(MessageConstants.LOGOUT_SUCCESS));
    }
}