package com.app.taskmanagement.exception;

public class AccountDisabledException extends AuthException {
    public AccountDisabledException() {
        super("Account is disabled");
    }
}
