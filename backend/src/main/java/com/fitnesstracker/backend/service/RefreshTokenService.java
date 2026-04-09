package com.fitnesstracker.backend.service;

import com.fitnesstracker.backend.model.AppUser;
import com.fitnesstracker.backend.model.RefreshToken;
import com.fitnesstracker.backend.repository.RefreshTokenRepository;
import com.fitnesstracker.backend.security.JwtService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;

    @Transactional
    public String issueTokenForUser(AppUser user) {
        refreshTokenRepository.deleteByUser(user);
        String refreshToken = jwtService.generateRefreshToken(user.getUsername());
        String tokenHash = hash(refreshToken);

        RefreshToken entity = RefreshToken.builder()
                .user(user)
                .tokenHash(tokenHash)
                .expiresAt(Instant.now().plusMillis(jwtService.getRefreshTokenExpirationMs()))
                .revoked(false)
                .build();
        refreshTokenRepository.save(entity);
        return refreshToken;
    }

    @Transactional(readOnly = true)
    public AppUser validateAndGetUser(String refreshToken) {
        String tokenHash = hash(refreshToken);
        RefreshToken entity = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new IllegalArgumentException("Invalid refresh token."));

        if (entity.isRevoked() || entity.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException("Refresh token expired or revoked.");
        }
        return entity.getUser();
    }

    @Transactional
    public void revokeByUser(AppUser user) {
        refreshTokenRepository.deleteByUser(user);
    }

    @Scheduled(fixedDelayString = "${app.auth.refresh-cleanup-ms}")
    @Transactional
    public void cleanupExpiredAndRevokedTokens() {
        refreshTokenRepository.deleteByRevokedTrueOrExpiresAtBefore(Instant.now());
    }

    private String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 not available.", exception);
        }
    }
}
