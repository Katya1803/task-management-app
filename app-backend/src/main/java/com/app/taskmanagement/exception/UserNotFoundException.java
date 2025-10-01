package com.app.taskmanagement.exception;

public class UserNotFoundException extends AuthException {
    public UserNotFoundException() {
        super("User not found");
    }
}
