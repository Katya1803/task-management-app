package com.app.taskmanagement.exception;

public class EmailNotVerifiedException extends AuthException {
    public EmailNotVerifiedException() {
        super("Email not verified. Please verify your email first.");
    }
}
