package com.agrisense.identity.service;

import com.agrisense.identity.config.AppProperties;
import com.agrisense.identity.domain.*;
import com.agrisense.identity.web.ApiException;
import com.agrisense.identity.web.Dtos.LoginRequest;
import com.agrisense.identity.web.Dtos.RegisterRequest;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final Duration RESET_TTL = Duration.ofMinutes(30);

    public record Session(User user, String accessToken, String refreshToken) {}

    private final UserRepository users;
    private final PasswordResetTokenRepository resets;
    private final RefreshTokenService refresh;
    private final JwtService jwt;
    private final PasswordHasher hasher;
    private final RateLimiter limiter;
    private final MailService mail;
    private final AppProperties props;
    private final Clock clock;

    public AuthService(UserRepository users, PasswordResetTokenRepository resets, RefreshTokenService refresh, JwtService jwt,
                       PasswordHasher hasher, RateLimiter limiter, MailService mail, AppProperties props, Clock clock) {
        this.users = users;
        this.resets = resets;
        this.refresh = refresh;
        this.jwt = jwt;
        this.hasher = hasher;
        this.limiter = limiter;
        this.mail = mail;
        this.props = props;
        this.clock = clock;
    }

    public static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    public Session register(RegisterRequest r, String ip) {
        limiter.check("register:ip:" + ip, props.rateLimit().registerPerIp(), window());
        String email = normalize(r.email());
        if (users.existsByEmail(email)) throw duplicate();
        User u = newUser(email, r.password(), r.displayName(), r.language(), Role.FARMER);
        try {
            users.saveAndFlush(u);
        } catch (DataIntegrityViolationException e) {
            throw duplicate();
        }
        log.info("User registered userId={}", u.id);
        return session(u);
    }

    public Session login(LoginRequest r, String ip) {
        String email = normalize(r.email());
        limiter.check("login:ip:" + ip, props.rateLimit().loginPerIp(), window());
        limiter.check("login:email:" + email, props.rateLimit().loginPerEmail(), window());
        User u = users.findByEmail(email).orElse(null);
        boolean ok = u != null ? hasher.matches(r.password(), u.passwordHash) : hasher.burn(r.password());
        if (!ok || !u.enabled) {
            log.info("Login failed for {}", MailService.mask(email));
            throw ApiException.unauthorized("Invalid credentials");
        }
        return session(u);
    }

    public Session refresh(String rawRefreshToken) {
        var rotation = refresh.rotate(rawRefreshToken);
        return new Session(rotation.user(), jwt.issueAccessToken(rotation.user()), rotation.token());
    }

    public void logout(String rawRefreshToken) {
        if (rawRefreshToken != null && !rawRefreshToken.isBlank()) refresh.revokeFamilyOf(rawRefreshToken);
    }

    /** Always completes silently so callers cannot tell whether the account exists. */
    public void forgot(String rawEmail, String ip) {
        String email = normalize(rawEmail);
        limiter.check("forgot:ip:" + ip, props.rateLimit().forgotPerIp(), window());
        limiter.check("forgot:email:" + email, props.rateLimit().forgotPerEmail(), window());
        users.findByEmail(email).filter(u -> u.enabled).ifPresent(u -> {
            resets.deleteUnusedForUser(u.id);
            String token = Tokens.random();
            PasswordResetToken t = new PasswordResetToken();
            t.id = UUID.randomUUID();
            t.userId = u.id;
            t.tokenHash = Tokens.sha256Hex(token);
            t.createdAt = clock.instant();
            t.expiresAt = t.createdAt.plus(RESET_TTL);
            resets.save(t);
            mail.sendPasswordReset(u, token);
        });
    }

    @Transactional
    public void reset(String token, String newPassword) {
        Instant now = clock.instant();
        PasswordResetToken t = resets.findByTokenHash(Tokens.sha256Hex(token)).orElseThrow(AuthService::badReset);
        User u = users.findById(t.userId).filter(x -> x.enabled).orElseThrow(AuthService::badReset);
        if (t.usedAt != null || !t.expiresAt.isAfter(now) || resets.markUsed(t.id, now) == 0) throw badReset();
        u.passwordHash = hasher.hash(newPassword);
        u.tokenVersion++;
        refresh.revokeAll(u.id);
        log.info("Password reset completed userId={}", u.id);
    }

    public User currentUser(UUID id) {
        return users.findById(id).orElseThrow(() -> ApiException.unauthorized("Not authenticated"));
    }

    public User newUser(String email, String password, String displayName, String language, Role... roles) {
        User u = new User();
        u.id = UUID.randomUUID();
        u.email = email;
        u.passwordHash = hasher.hash(password);
        u.displayName = displayName == null || displayName.isBlank() ? null : displayName.trim();
        u.language = language == null ? "en" : language;
        u.roles.addAll(java.util.List.of(roles));
        u.createdAt = u.updatedAt = clock.instant();
        return u;
    }

    private Session session(User u) {
        return new Session(u, jwt.issueAccessToken(u), refresh.startFamily(u));
    }

    private Duration window() {
        return Duration.ofSeconds(props.rateLimit().windowSeconds());
    }

    private static ApiException duplicate() {
        return ApiException.conflict("An account could not be created with the provided details.");
    }

    private static ApiException badReset() {
        return ApiException.badRequest("Invalid or expired reset token.");
    }
}
