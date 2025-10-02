package com.app.taskmanagement.constant;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    INVALID_CREDENTIALS("AUTH_1001", "Invalid email or password", HttpStatus.UNAUTHORIZED),
    EMAIL_ALREADY_EXISTS("AUTH_1002", "Email already registered", HttpStatus.CONFLICT),
    EMAIL_NOT_VERIFIED("AUTH_1003", "Email not verified", HttpStatus.FORBIDDEN),
    INVALID_OTP("AUTH_1004", "Invalid or expired OTP", HttpStatus.BAD_REQUEST),
    INVALID_TOKEN("AUTH_1005", "Invalid or expired token", HttpStatus.UNAUTHORIZED),
    USER_NOT_FOUND("AUTH_1006", "User not found", HttpStatus.NOT_FOUND),
    ACCOUNT_DISABLED("AUTH_1007", "Account is disabled", HttpStatus.FORBIDDEN),
    TOO_MANY_OTP_ATTEMPTS("AUTH_1008", "Too many OTP requests", HttpStatus.TOO_MANY_REQUESTS),

    OAUTH2_VERIFICATION_FAILED("OAUTH_2001", "Failed to verify OAuth2 token", HttpStatus.UNAUTHORIZED),
    EMAIL_REQUIRED_FOR_OAUTH("OAUTH_2002", "Email is required for this OAuth provider", HttpStatus.BAD_REQUEST),

    VALIDATION_ERROR("VAL_3001", "Validation failed", HttpStatus.BAD_REQUEST),

    INTERNAL_ERROR("SYS_9001", "Internal server error", HttpStatus.INTERNAL_SERVER_ERROR),
    EMAIL_SEND_FAILED("SYS_9002", "Failed to send email", HttpStatus.INTERNAL_SERVER_ERROR);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}