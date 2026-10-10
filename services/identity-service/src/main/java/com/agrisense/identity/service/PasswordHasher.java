package com.agrisense.identity.service;

import java.util.UUID;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class PasswordHasher {
    // Argon2id, OWASP minimum profile: memory 19 MiB (19456 KiB), 2 iterations, parallelism 1,
    // 16-byte salt, 32-byte hash. Parameters are embedded in each hash, so they can be raised later.
    private final Argon2PasswordEncoder encoder = new Argon2PasswordEncoder(16, 32, 1, 19_456, 2);
    private final String dummyHash = encoder.encode(UUID.randomUUID().toString());

    public String hash(String raw) {
        return encoder.encode(raw);
    }

    public boolean matches(String raw, String hash) {
        return encoder.matches(raw, hash);
    }

    /** Spend the same time as a real verification (unknown-user login path). Always false. */
    public boolean burn(String raw) {
        encoder.matches(raw, dummyHash);
        return false;
    }
}
