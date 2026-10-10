package com.agrisense.identity.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {
    @Id public UUID id;
    public String email;
    @Column(name = "password_hash") public String passwordHash;
    @Column(name = "display_name") public String displayName;
    public String language = "en";
    @Column(name = "experience_level") public String experienceLevel;
    @Column(name = "preferred_state_key") public String preferredStateKey;
    @Column(name = "preferred_district_key") public String preferredDistrictKey;
    @Column(name = "onboarding_completed") public boolean onboardingCompleted;
    public boolean enabled = true;
    @Column(name = "token_version") public int tokenVersion;
    @Column(name = "created_at") public Instant createdAt = Instant.now();
    @Column(name = "updated_at") public Instant updatedAt = Instant.now();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "role")
    @Enumerated(EnumType.STRING)
    public Set<Role> roles = new HashSet<>();

    @PreUpdate
    void touch() {
        updatedAt = Instant.now();
    }
}
