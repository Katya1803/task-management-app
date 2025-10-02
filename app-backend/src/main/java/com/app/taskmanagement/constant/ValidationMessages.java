package com.app.taskmanagement.constant;

public final class ValidationMessages {

    private ValidationMessages() {
        throw new UnsupportedOperationException("Utility class");
    }

    public static final String EMAIL_REQUIRED = "Email is required";
    public static final String EMAIL_INVALID = "Email must be valid";

    public static final String PROVIDER_ID_REQUIRED = "Provider ID is required";
    public static final String PROVIDER_REQUIRED = "Provider is required";

    public static final String PASSWORD_REQUIRED = "Password is required";
    public static final int PASSWORD_MIN_LENGTH = 6;
    public static final String PASSWORD_MIN_LENGTH_MSG = "Password must be at least 6 characters";

    public static final String FULLNAME_REQUIRED = "Full name is required";
    public static final int FULLNAME_MIN_LENGTH = 2;
    public static final int FULLNAME_MAX_LENGTH = 100;
    public static final String FULLNAME_LENGTH_MSG = "Full name must be between 2 and 100 characters";

    public static final String OTP_REQUIRED = "OTP is required";
    public static final int OTP_EXACT_LENGTH = 6;
    public static final String OTP_LENGTH_MSG = "OTP must be 6 digits";

    public static final String TOKEN_REQUIRED = "Token is required";
}
