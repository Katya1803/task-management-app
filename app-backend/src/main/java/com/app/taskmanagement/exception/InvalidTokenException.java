package com.app.taskmanagement.exception;

public class InvalidTokenException extends AuthException {
    public InvalidTokenException() {
        super("Invalid or expired token");
    }
}
