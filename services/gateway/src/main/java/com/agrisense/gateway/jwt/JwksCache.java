package com.agrisense.gateway.jwt;

import com.agrisense.gateway.config.GatewayProperties;
import com.agrisense.gateway.logging.RequestLog;
import com.nimbusds.jose.jwk.JWK;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicReference;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

/**
 * Caches the identity JWKS. Refreshes on TTL expiry and on an unknown kid (rate limited by a cooldown).
 * Fails closed: nothing cached and JWKS unreachable -> unavailable.
 */
@Component
public class JwksCache {

    private record Snapshot(List<RSAKey> keys, long fetchedAtNanos) {}

    private final WebClient client = WebClient.builder().build();
    private final String url;
    private final Duration timeout;
    private final long ttlNanos;
    private final long cooldownNanos;
    private final AtomicReference<Snapshot> snapshot = new AtomicReference<>();
    private volatile long lastAttemptNanos = 0;
    private volatile boolean attempted = false;

    public JwksCache(GatewayProperties props) {
        this.url = props.getIdentityJwksUrl();
        this.timeout = Duration.ofMillis(props.getJwksTimeoutMs());
        this.ttlNanos = Duration.ofSeconds(props.getJwksTtlSeconds()).toNanos();
        this.cooldownNanos = Duration.ofSeconds(props.getJwksUnknownKidCooldownSeconds()).toNanos();
    }

    /** Candidate verification keys for the given kid (kid may be null: all keys are candidates). */
    public Mono<List<RSAKey>> keysFor(String kid) {
        Snapshot s = snapshot.get();
        long now = System.nanoTime();
        if (s != null) {
            List<RSAKey> match = match(s.keys(), kid);
            boolean fresh = now - s.fetchedAtNanos() < ttlNanos;
            if (!match.isEmpty() && fresh) {
                return Mono.just(match);
            }
            boolean coolingDown = attempted && now - lastAttemptNanos < cooldownNanos;
            if (coolingDown && fresh) {
                return Mono.just(match); // unknown kid, but we refreshed very recently
            }
            return refresh().map(fresh2 -> match(fresh2, kid))
                    .onErrorResume(e -> Mono.just(match)); // stale keys beat no keys; unknown kid stays rejected
        }
        return refresh().map(list -> match(list, kid))
                .onErrorMap(e -> new JwtException("signing keys unavailable", true));
    }

    private Mono<List<RSAKey>> refresh() {
        attempted = true;
        lastAttemptNanos = System.nanoTime();
        return client.get().uri(url).retrieve().bodyToMono(String.class)
                .timeout(timeout)
                .map(body -> {
                    try {
                        JWKSet set = JWKSet.parse(body);
                        List<RSAKey> keys = new ArrayList<>();
                        for (JWK k : set.getKeys()) {
                            if (k instanceof RSAKey r && !k.isPrivate()
                                    && (k.getKeyUse() == null || "sig".equals(k.getKeyUse().identifier()))) {
                                keys.add(r);
                            }
                        }
                        if (keys.isEmpty()) {
                            throw new IllegalStateException("no usable RSA keys in JWKS");
                        }
                        snapshot.set(new Snapshot(List.copyOf(keys), System.nanoTime()));
                        return List.copyOf(keys);
                    } catch (java.text.ParseException e) {
                        throw new IllegalStateException("invalid JWKS document");
                    }
                })
                .doOnError(e -> RequestLog.warn("", "JWKS refresh failed: " + e.getClass().getSimpleName()));
    }

    private static List<RSAKey> match(List<RSAKey> keys, String kid) {
        if (kid == null) {
            return keys;
        }
        return keys.stream().filter(k -> Objects.equals(k.getKeyID(), kid)).toList();
    }
}
