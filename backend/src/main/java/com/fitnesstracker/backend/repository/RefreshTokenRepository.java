package com.fitnesstracker.backend.repository;

import com.fitnesstracker.backend.model.AppUser;
import com.fitnesstracker.backend.model.RefreshToken;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    void deleteByUser(AppUser user);

    void deleteByRevokedTrueOrExpiresAtBefore(Instant cutoff);
}
