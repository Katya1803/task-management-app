package com.app.taskmanagement.constant;

public final class ApiPath {

    private ApiPath() {}

    public static final class Test {
        public static final String BASE = "/api/test";
        public static final String HELLO = "/hello";
        public static final String SECURE = "/secure";
        public static final String HEALTH = "/health";
        public static final String ECHO = "/echo";
    }

    public static final class Auth {
        public static final String BASE = "/api/auth";
        public static final String HEALTH = "/health";
        public static final String REGISTER = "/register";
        public static final String VERIFY_EMAIL = "/verify-email";
        public static final String RESEND_OTP = "/resend-otp";
        public static final String LOGIN = "/login";
        public static final String GOOGLE = "/google";
        public static final String FACEBOOK = "/facebook";
        public static final String REFRESH = "/refresh";
        public static final String LOGOUT = "/logout";
    }
}