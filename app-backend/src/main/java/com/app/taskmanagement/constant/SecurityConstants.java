package com.app.taskmanagement.constant;

public final class SecurityConstants {

    private SecurityConstants() {
        throw new UnsupportedOperationException("Utility class");
    }

    // JWT & AUTH
    public static final String TOKEN_TYPE = "Bearer";
    public static final String AUTHORIZATION_HEADER = "Authorization";
    public static final String TOKEN_PREFIX = "Bearer ";
    public static final int TOKEN_PREFIX_LENGTH = 7;

    // COOKIE
    public static final String REFRESH_TOKEN_COOKIE = "refreshToken";
    public static final String COOKIE_PATH = "/";
    public static final int COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 ngày

    // REDIS PREFIX
    public static final String REFRESH_TOKEN_PREFIX = "refresh:";
    public static final String USER_TOKENS_PREFIX = "user_tokens:";
    public static final String OTP_PREFIX = "otp:";
    public static final String OTP_ATTEMPTS_PREFIX = "otp_attempts:";

    // OTP CONFIG
    public static final int MAX_OTP_ATTEMPTS = 5;
    public static final int OTP_RATE_LIMIT_WINDOW_MINUTES = 15;

    // EXTERNAL API URL
    public static final String FACEBOOK_BASE_URL = "https://graph.facebook.com";
    public static final String FACEBOOK_USER_INFO_URL =
            FACEBOOK_BASE_URL + "/me?fields=id,name,email&access_token=%s";
    public static final String FACEBOOK_DEBUG_TOKEN_URL =
            FACEBOOK_BASE_URL + "/debug_token?input_token=%s&access_token=%s|%s";


}
