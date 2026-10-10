package com.agrisense.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.agrisense.identity.config.AppProperties;
import com.agrisense.identity.domain.*;
import com.agrisense.identity.service.*;
import com.agrisense.identity.web.ApiException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class UnitTests {

    // ---- password policy / hashing ----
    @Test
    void passwordPolicyBounds() {
        assertThat(PasswordPolicy.isValid("123456789")).isFalse();
        assertThat(PasswordPolicy.isValid("1234567890")).isTrue();
        assertThat(PasswordPolicy.isValid("x".repeat(128))).isTrue();
        assertThat(PasswordPolicy.isValid("x".repeat(129))).isFalse();
        assertThat(PasswordPolicy.isValid(null)).isFalse();
    }

    @Test
    void argon2idHashesVerifyAndAreSalted() {
        var h = new PasswordHasher();
        String a = h.hash("correct-horse-battery"), b = h.hash("correct-horse-battery");
        assertThat(a).startsWith("$argon2id$").isNotEqualTo(b);
        assertThat(h.matches("correct-horse-battery", a)).isTrue();
        assertThat(h.matches("wrong", a)).isFalse();
        assertThat(h.burn("anything")).isFalse();
    }

    // ---- tokens ----
    @Test
    void tokenHashingAndGeneration() {
        assertThat(Tokens.sha256Hex("abc")).isEqualTo("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad").hasSize(64);
        String t1 = Tokens.random(), t2 = Tokens.random();
        assertThat(t1).isNotEqualTo(t2).matches("[A-Za-z0-9_-]{43}");
        assertThat(Base64.getUrlDecoder().decode(t1)).hasSize(32);
    }

    // ---- rate limiter ----
    @Test
    void slidingWindowLimiter() {
        var now = new Instant[] {Instant.parse("2026-01-01T00:00:00Z")};
        Clock clock = new Clock() {
            public ZoneOffset getZone() { return ZoneOffset.UTC; }
            public Clock withZone(java.time.ZoneId z) { return this; }
            public Instant instant() { return now[0]; }
        };
        var limiter = new RateLimiter(clock);
        Duration w = Duration.ofSeconds(60);
        limiter.check("k", 2, w);
        now[0] = now[0].plusSeconds(10);
        limiter.check("k", 2, w);
        limiter.check("other", 2, w);
        assertThatThrownBy(() -> limiter.check("k", 2, w)).isInstanceOfSatisfying(ApiException.class, e -> {
            assertThat(e.status).isEqualTo(429);
            assertThat(e.retryAfterSeconds).isEqualTo(50);
        });
        now[0] = now[0].plusSeconds(51); // first hit has left the window
        limiter.check("k", 2, w);
    }

    // ---- JWT key handling ----
    @Test
    void jwtServiceIssuesVerifiableTokensAndRejectsExpiredOnes() throws Exception {
        var props = new AppProperties(false, "none", "", "", "", new AppProperties.RateLimit(900, 30, 10, 10, 10, 3));
        var svc = new JwtService(props, Clock.systemUTC());
        User u = user();
        var jwt = svc.parse(svc.issueAccessToken(u)).orElseThrow();
        assertThat(jwt.getSubject()).isEqualTo(u.id.toString());
        assertThat(jwt.getClaimAsStringList("roles")).containsExactly("FARMER");
        assertThat(svc.parse(svc.issueAccessToken(u) + "x")).isEmpty();
        var old = new JwtService(props, Clock.offset(Clock.systemUTC(), Duration.ofHours(-2)));
        assertThat(svc.parse(old.issueAccessToken(u))).isEmpty(); // different key anyway
        var sameKeyOld = new JwtService(withPem(props, svc), Clock.offset(Clock.systemUTC(), Duration.ofHours(-2)));
        var sameKey = new JwtService(withPem(props, svc), Clock.systemUTC());
        assertThat(sameKey.parse(sameKeyOld.issueAccessToken(u))).isEmpty(); // expired
        assertThat(sameKey.parse(sameKey.issueAccessToken(u))).isPresent();
    }

    private static final String PEM = pem();

    private static AppProperties withPem(AppProperties p, JwtService ignored) {
        return new AppProperties(false, "none", PEM, "", "", p.rateLimit());
    }

    private static String pem() {
        try {
            var g = java.security.KeyPairGenerator.getInstance("RSA");
            g.initialize(2048);
            String b64 = Base64.getMimeEncoder(64, "\n".getBytes()).encodeToString(g.generateKeyPair().getPrivate().getEncoded());
            return "-----BEGIN PRIVATE KEY-----\n" + b64 + "\n-----END PRIVATE KEY-----";
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    @Test
    void pemKeyLoadsIncludingEscapedNewlinesAndRejectsGarbage() {
        var k1 = JwtKeys.load(PEM);
        var k2 = JwtKeys.load(PEM.replace("\n", "\\n"));
        assertThat(k1.getKeyID()).isEqualTo(k2.getKeyID()).isNotBlank();
        assertThat(k1.isPrivate()).isTrue();
        assertThat(JwtKeys.load("").getKeyID()).isNotEqualTo(k1.getKeyID());
        assertThatThrownBy(() -> JwtKeys.load("-----BEGIN PRIVATE KEY-----\nabcd\n-----END PRIVATE KEY-----"))
                .isInstanceOf(IllegalStateException.class);
    }

    // ---- refresh rotation / reuse ----
    private final RefreshTokenRepository tokens = mock(RefreshTokenRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final Instant t0 = Instant.parse("2026-01-01T00:00:00Z");
    private final RefreshTokenService service = new RefreshTokenService(tokens, users, Clock.fixed(t0, ZoneOffset.UTC));

    private static User user() {
        User u = new User();
        u.id = UUID.randomUUID();
        u.roles.add(Role.FARMER);
        return u;
    }

    private RefreshToken stored(String raw, UUID userId) {
        RefreshToken t = new RefreshToken();
        t.id = UUID.randomUUID();
        t.userId = userId;
        t.familyId = UUID.randomUUID();
        t.tokenHash = Tokens.sha256Hex(raw);
        t.issuedAt = t0.minusSeconds(60);
        t.expiresAt = t0.plus(Duration.ofDays(3));
        t.absoluteExpiresAt = t0.plus(Duration.ofDays(20));
        when(tokens.findByTokenHash(t.tokenHash)).thenReturn(Optional.of(t));
        when(tokens.save(any())).thenAnswer(i -> i.getArgument(0));
        return t;
    }

    @Test
    void rotationConsumesOldTokenAndKeepsFamilyAndAbsoluteExpiry() {
        User u = user();
        RefreshToken old = stored("old", u.id);
        when(users.findById(u.id)).thenReturn(Optional.of(u));
        when(tokens.markUsed(old.id, t0)).thenReturn(1);

        var r = service.rotate("old");

        assertThat(r.token()).isNotEqualTo("old");
        var saved = org.mockito.ArgumentCaptor.forClass(RefreshToken.class);
        verify(tokens).save(saved.capture());
        assertThat(saved.getValue().familyId).isEqualTo(old.familyId);
        assertThat(saved.getValue().tokenHash).isEqualTo(Tokens.sha256Hex(r.token()));
        assertThat(saved.getValue().expiresAt).isEqualTo(t0.plus(Duration.ofDays(7)));
        assertThat(saved.getValue().absoluteExpiresAt).isEqualTo(old.absoluteExpiresAt);
        verify(tokens, never()).revokeFamily(any());
    }

    @Test
    void idleExpiryIsCappedByAbsoluteExpiry() {
        User u = user();
        RefreshToken old = stored("old", u.id);
        old.absoluteExpiresAt = t0.plus(Duration.ofDays(2));
        when(users.findById(u.id)).thenReturn(Optional.of(u));
        when(tokens.markUsed(any(), any())).thenReturn(1);
        service.rotate("old");
        var saved = org.mockito.ArgumentCaptor.forClass(RefreshToken.class);
        verify(tokens).save(saved.capture());
        assertThat(saved.getValue().expiresAt).isEqualTo(t0.plus(Duration.ofDays(2)));
    }

    @Test
    void reusedTokenRevokesFamilyAndIs401() {
        RefreshToken old = stored("old", UUID.randomUUID());
        old.used = true;
        assertThatThrownBy(() -> service.rotate("old")).isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.status).isEqualTo(401));
        verify(tokens).revokeFamily(old.familyId);
        verify(tokens, never()).save(any());
    }

    @Test
    void unknownRevokedExpiredAndRaceLosingTokensAreRejected() {
        assertThatThrownBy(() -> service.rotate("nope")).isInstanceOf(ApiException.class);

        RefreshToken revoked = stored("revoked", UUID.randomUUID());
        revoked.revoked = true;
        assertThatThrownBy(() -> service.rotate("revoked")).isInstanceOf(ApiException.class);

        RefreshToken idle = stored("idle", UUID.randomUUID());
        idle.expiresAt = t0.minusSeconds(1);
        assertThatThrownBy(() -> service.rotate("idle")).isInstanceOf(ApiException.class);

        RefreshToken abs = stored("abs", UUID.randomUUID());
        abs.absoluteExpiresAt = t0;
        assertThatThrownBy(() -> service.rotate("abs")).isInstanceOf(ApiException.class);

        User u = user();
        RefreshToken race = stored("race", u.id);
        when(users.findById(u.id)).thenReturn(Optional.of(u));
        when(tokens.markUsed(race.id, t0)).thenReturn(0);
        assertThatThrownBy(() -> service.rotate("race")).isInstanceOf(ApiException.class);
        verify(tokens).revokeFamily(race.familyId);
        verify(tokens, never()).save(any());
    }

    @Test
    void disabledUserCannotRotate() {
        User u = user();
        u.enabled = false;
        RefreshToken t = stored("tok", u.id);
        when(users.findById(u.id)).thenReturn(Optional.of(u));
        assertThatThrownBy(() -> service.rotate("tok")).isInstanceOf(ApiException.class);
        verify(tokens).revokeFamily(t.familyId);
    }
}
