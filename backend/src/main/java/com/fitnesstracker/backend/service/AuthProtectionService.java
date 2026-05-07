package com.fitnesstracker.backend.service;

import com.fitnesstracker.backend.exception.AccountLockedException;
import com.fitnesstracker.backend.exception.AuthRateLimitException;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AuthProtectionService {

    private final int maxRequestsPerWindow;
    private final Duration rateLimitWindow;
    private final int failedAttemptsBeforeLockout;
    private final Duration failedAttemptWindow;
    private final Duration lockoutDuration;

    private final Map<String, AttemptWindow> rateBuckets = new ConcurrentHashMap<>();
    private final Map<String, AttemptWindow> failedLoginBuckets = new ConcurrentHashMap<>();
    private final Map<String, Instant> lockedUsers = new ConcurrentHashMap<>();

    public AuthProtectionService(
            @Value("${app.auth.rate-limit.max-attempts:10}") int maxRequestsPerWindow,
            @Value("${app.auth.rate-limit.window-ms:300000}") long rateLimitWindowMs,
            @Value("${app.auth.lockout.failed-attempts:5}") int failedAttemptsBeforeLockout,
            @Value("${app.auth.lockout.failed-window-ms:900000}") long failedAttemptWindowMs,
            @Value("${app.auth.lockout.duration-ms:900000}") long lockoutDurationMs
    ) {
        this.maxRequestsPerWindow = maxRequestsPerWindow;
        this.rateLimitWindow = Duration.ofMillis(rateLimitWindowMs);
        this.failedAttemptsBeforeLockout = failedAttemptsBeforeLockout;
        this.failedAttemptWindow = Duration.ofMillis(failedAttemptWindowMs);
        this.lockoutDuration = Duration.ofMillis(lockoutDurationMs);
    }

    public void guardLoginAttempt(String username, String clientKey) {
        Instant now = Instant.now();
        String normalizedUsername = normalizeUsername(username);
        String normalizedClientKey = normalizeClientKey(clientKey);

        Instant lockedUntil = lockedUsers.get(normalizedUsername);
        if (lockedUntil != null) {
            if (lockedUntil.isAfter(now)) {
                long retryAfterSeconds = Math.max(1, Duration.between(now, lockedUntil).toSeconds());
                throw new AccountLockedException("Account temporarily locked. Try again later.", retryAfterSeconds);
            }
            lockedUsers.remove(normalizedUsername);
        }

        String requestBucketKey = normalizedClientKey + "|" + normalizedUsername;
        AttemptWindow requestWindow = rateBuckets.computeIfAbsent(requestBucketKey, ignored -> new AttemptWindow(now));
        requestWindow.resetIfExpired(now, rateLimitWindow);
        int currentCount = requestWindow.incrementAndGet();

        if (currentCount > maxRequestsPerWindow) {
            long retryAfterSeconds = Math.max(1, requestWindow.remainingSeconds(now, rateLimitWindow));
            throw new AuthRateLimitException("Too many login attempts. Please wait and try again.", retryAfterSeconds);
        }
    }

    public void markFailedLogin(String username) {
        Instant now = Instant.now();
        String normalizedUsername = normalizeUsername(username);
        AttemptWindow failedWindow = failedLoginBuckets.computeIfAbsent(normalizedUsername, ignored -> new AttemptWindow(now));
        failedWindow.resetIfExpired(now, failedAttemptWindow);
        int failedCount = failedWindow.incrementAndGet();

        if (failedCount >= failedAttemptsBeforeLockout) {
            Instant lockedUntil = now.plus(lockoutDuration);
            lockedUsers.put(normalizedUsername, lockedUntil);
            failedLoginBuckets.remove(normalizedUsername);
        }
    }

    public void markSuccessfulLogin(String username) {
        String normalizedUsername = normalizeUsername(username);
        failedLoginBuckets.remove(normalizedUsername);
        lockedUsers.remove(normalizedUsername);
    }

    private String normalizeUsername(String username) {
        return (username == null ? "" : username).trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeClientKey(String clientKey) {
        return (clientKey == null || clientKey.isBlank()) ? "unknown-client" : clientKey.trim();
    }

    private static final class AttemptWindow {
        private Instant windowStart;
        private int count;

        private AttemptWindow(Instant now) {
            this.windowStart = now;
            this.count = 0;
        }

        private synchronized void resetIfExpired(Instant now, Duration window) {
            if (windowStart.plus(window).isBefore(now)) {
                windowStart = now;
                count = 0;
            }
        }

        private synchronized int incrementAndGet() {
            count += 1;
            return count;
        }

        private synchronized long remainingSeconds(Instant now, Duration window) {
            Instant windowEnd = windowStart.plus(window);
            if (!windowEnd.isAfter(now)) {
                return 0;
            }
            return Duration.between(now, windowEnd).toSeconds();
        }
    }
}
