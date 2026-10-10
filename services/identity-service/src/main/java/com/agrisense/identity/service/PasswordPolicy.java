package com.agrisense.identity.service;

public final class PasswordPolicy {
    public static final int MIN_LENGTH = 10, MAX_LENGTH = 128;

    private PasswordPolicy() {}

    public static boolean isValid(String password) {
        return password != null && password.length() >= MIN_LENGTH && password.length() <= MAX_LENGTH;
    }
}
