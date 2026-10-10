package com.agrisense.identity.domain;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    Optional<RefreshToken> findByTokenHash(String tokenHash);

    /** Atomic compare-and-set so two concurrent refreshes cannot both succeed. */
    @Transactional
    @Modifying(flushAutomatically = true)
    @Query("update RefreshToken t set t.used = true, t.lastUsedAt = :now where t.id = :id and t.used = false and t.revoked = false")
    int markUsed(@Param("id") UUID id, @Param("now") Instant now);

    @Transactional
    @Modifying(flushAutomatically = true)
    @Query("update RefreshToken t set t.revoked = true where t.familyId = :family and t.revoked = false")
    int revokeFamily(@Param("family") UUID familyId);

    @Transactional
    @Modifying(flushAutomatically = true)
    @Query("update RefreshToken t set t.revoked = true where t.userId = :user and t.revoked = false")
    int revokeAllForUser(@Param("user") UUID userId);
}
