package com.fitnesstracker.backend.exception;

public class AuthRateLimitException extends RuntimeException {

    private final long retryAfterSeconds;

    public AuthRateLimitException(String message, long retryAfterSeconds) {
        super(message);
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
