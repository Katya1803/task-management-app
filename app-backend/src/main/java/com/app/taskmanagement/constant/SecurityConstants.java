package com.app.taskmanagement.constant;

public final class SecurityConstants {

    private SecurityConstants() {
        throw new UnsupportedOperationException("Utility class");
    }

    public static final String TOKEN_TYPE = "Bearer";
    public static final String AUTHORIZATION_HEADER = "Authorization";
    public static final String TOKEN_PREFIX = "Bearer ";
    public static final int TOKEN_PREFIX_LENGTH = 7;

    public static final String REFRESH_TOKEN_COOKIE = "refreshToken";
    public static final String COOKIE_PATH = "/";
    public static final int COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

    public static final String REFRESH_TOKEN_PREFIX = "refresh:";
    public static final String USER_TOKENS_PREFIX = "user_tokens:";
    public static final String OTP_PREFIX = "otp:";
    public static final String OTP_ATTEMPTS_PREFIX = "otp_attempts:";

    public static final int MAX_OTP_ATTEMPTS = 5;
    public static final int OTP_RATE_LIMIT_WINDOW_MINUTES = 15;
}
