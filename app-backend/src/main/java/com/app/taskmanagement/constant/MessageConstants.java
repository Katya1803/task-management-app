package com.app.taskmanagement.constant;

public final class MessageConstants {

    private MessageConstants() {
        throw new UnsupportedOperationException("Utility class");
    }

    public static final String REGISTRATION_SUCCESS = "Registration successful. Please check your email for verification code.";
    public static final String EMAIL_VERIFIED = "Email verified successfully. You can now login.";
    public static final String OTP_SENT = "Verification code sent successfully.";
    public static final String LOGOUT_SUCCESS = "Logged out successfully";

    public static final String EMAIL_FROM_NAME = "Task Management Team";
    public static final String OTP_EMAIL_SUBJECT = "Email Verification - Task Management App";
    public static final String WELCOME_EMAIL_SUBJECT = "Welcome to Task Management App!";
}