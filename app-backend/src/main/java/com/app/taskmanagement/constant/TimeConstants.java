package com.app.taskmanagement.constant;

public final class TimeConstants {

    private TimeConstants() {
        throw new UnsupportedOperationException("Utility class");
    }

    public static final int OTP_LENGTH = 6;
    public static final int OTP_EXPIRATION_MINUTES = 5;

    public static final int ACCESS_TOKEN_EXPIRATION_MINUTES = 15;
    public static final int REFRESH_TOKEN_EXPIRATION_DAYS = 7;
}