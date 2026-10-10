package com.agrisense.identity.service;

import com.agrisense.identity.domain.RefreshToken;
import com.agrisense.identity.domain.RefreshTokenRepository;
import com.agrisense.identity.domain.User;
import com.agrisense.identity.domain.UserRepository;
import com.agrisense.identity.web.ApiException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RefreshTokenService {
    private static final Logger log = LoggerFactory.getLogger(RefreshTokenService.class);
    public static final Duration IDLE_TTL = Duration.ofDays(7), ABSOLUTE_TTL = Duration.ofDays(30);

    public record Rotation(User user, String token) {}

    private final RefreshTokenRepository tokens;
    private final UserRepository users;
    private final Clock clock;

    public RefreshTokenService(RefreshTokenRepository tokens, UserRepository users, Clock clock) {
        this.tokens = tokens;
        this.users = users;
        this.clock = clock;
    }

    public String startFamily(User user) {
        Instant now = clock.instant();
        return store(user.id, UUID.randomUUID(), now, now.plus(IDLE_TTL), now.plus(ABSOLUTE_TTL));
    }

    /** Single-use rotation. noRollbackFor keeps the family revocation when a reused token is rejected. */
    @Transactional(noRollbackFor = ApiException.class)
    public Rotation rotate(String raw) {
        Instant now = clock.instant();
        RefreshToken t = tokens.findByTokenHash(Tokens.sha256Hex(raw)).orElseThrow(RefreshTokenService::invalid);
        if (t.revoked) throw invalid();
        if (t.used) {
            tokens.revokeFamily(t.familyId);
            log.warn("Refresh token reuse detected, family revoked userId={}", t.userId);
            throw invalid();
        }
        if (!t.expiresAt.isAfter(now) || !t.absoluteExpiresAt.isAfter(now)) throw invalid();
        User user = users.findById(t.userId).filter(u -> u.enabled).orElse(null);
        if (user == null) {
            tokens.revokeFamily(t.familyId);
            throw invalid();
        }
        if (tokens.markUsed(t.id, now) == 0) { // lost a race with a concurrent use of the same token
            tokens.revokeFamily(t.familyId);
            throw invalid();
        }
        Instant idle = now.plus(IDLE_TTL);
        Instant expires = idle.isBefore(t.absoluteExpiresAt) ? idle : t.absoluteExpiresAt;
        return new Rotation(user, store(user.id, t.familyId, now, expires, t.absoluteExpiresAt));
    }

    /** Logout: revoke the family of the presented token, whatever its state. */
    public void revokeFamilyOf(String raw) {
        tokens.findByTokenHash(Tokens.sha256Hex(raw)).ifPresent(t -> tokens.revokeFamily(t.familyId));
    }

    public void revokeAll(UUID userId) {
        tokens.revokeAllForUser(userId);
    }

    private String store(UUID userId, UUID family, Instant now, Instant expires, Instant absolute) {
        String raw = Tokens.random();
        RefreshToken t = new RefreshToken();
        t.id = UUID.randomUUID();
        t.userId = userId;
        t.familyId = family;
        t.tokenHash = Tokens.sha256Hex(raw);
        t.issuedAt = now;
        t.expiresAt = expires;
        t.absoluteExpiresAt = absolute;
        tokens.save(t);
        return raw;
    }

    private static ApiException invalid() {
        return ApiException.unauthorized("Invalid or expired session.");
    }
}
