package com.agrisense.identity.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "refresh_tokens")
public class RefreshToken {
    @Id public UUID id;
    @Column(name = "user_id") public UUID userId;
    @Column(name = "family_id") public UUID familyId;
    @Column(name = "token_hash") public String tokenHash;
    @Column(name = "issued_at") public Instant issuedAt;
    @Column(name = "last_used_at") public Instant lastUsedAt;
    @Column(name = "expires_at") public Instant expiresAt;
    @Column(name = "absolute_expires_at") public Instant absoluteExpiresAt;
    public boolean used;
    public boolean revoked;
}
