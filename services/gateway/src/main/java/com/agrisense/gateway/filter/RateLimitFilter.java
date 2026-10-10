package com.agrisense.gateway.filter;

import com.agrisense.gateway.config.GatewayProperties;
import com.agrisense.gateway.error.Problems;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

/**
 * In-memory token bucket per client IP. SINGLE INSTANCE ONLY: buckets are not shared between gateway
 * replicas; scaling out needs a shared store (e.g. Redis).
 */
@Component
public class RateLimitFilter implements WebFilter, Ordered {

    private static final Set<String> STRICT_PATHS = Set.of(
            "/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/forgot", "/api/v1/auth/reset");

    private final int general;
    private final int strict;
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final AtomicLong calls = new AtomicLong();

    public RateLimitFilter(GatewayProperties props) {
        this.general = props.getRateLimit().getGeneralPerMinute();
        this.strict = props.getRateLimit().getAuthPerMinute();
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 20;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String path = FilterPaths.normalize(exchange.getRequest().getPath().value());
        if (path.equals("/health") || path.equals("/ready")) {
            return chain.filter(exchange);
        }
        boolean isStrict = STRICT_PATHS.contains(path);
        int limit = isStrict ? strict : general;
        String key = (isStrict ? "auth|" : "gen|") + clientIp(exchange.getRequest());
        if (calls.incrementAndGet() % 1024 == 0) {
            evictIdle();
        }
        long retryAfter = buckets.computeIfAbsent(key, k -> new Bucket(limit)).tryAcquire();
        if (retryAfter == 0) {
            return chain.filter(exchange);
        }
        return Problems.write(exchange, 429, "rate-limited", "Too many requests",
                "Rate limit exceeded. Retry later.", Map.of("Retry-After", Long.toString(retryAfter)));
    }

    private void evictIdle() {
        long now = System.nanoTime();
        buckets.entrySet().removeIf(e -> now - e.getValue().lastNanos() > 120_000_000_000L);
    }

    static String clientIp(ServerHttpRequest req) {
        InetSocketAddress remote = req.getRemoteAddress();
        InetAddress peer = remote == null ? null : remote.getAddress();
        if (peer != null && isInternalPeer(peer)) {
            String xff = req.getHeaders().getFirst("X-Forwarded-For");
            if (xff != null && !xff.isBlank()) {
                String first = xff.split(",")[0].trim();
                if (!first.isEmpty() && first.length() <= 45) {
                    return first;
                }
            }
        }
        return peer == null ? "unknown" : peer.getHostAddress();
    }

    static boolean isInternalPeer(InetAddress a) {
        if (a.isLoopbackAddress() || a.isSiteLocalAddress() || a.isLinkLocalAddress()) {
            return true;
        }
        byte[] b = a.getAddress();
        return b.length == 16 && (b[0] & 0xFE) == 0xFC; // IPv6 unique local fc00::/7
    }

    /** Token bucket: capacity = limit, refilled continuously at limit per minute. */
    static final class Bucket {
        private final double capacity;
        private final double ratePerNano;
        private double tokens;
        private long last;

        Bucket(int perMinute) {
            this.capacity = perMinute;
            this.ratePerNano = perMinute / 60_000_000_000.0;
            this.tokens = perMinute;
            this.last = System.nanoTime();
        }

        synchronized long lastNanos() {
            return last;
        }

        /** Returns 0 when allowed, otherwise seconds to wait. */
        synchronized long tryAcquire() {
            long now = System.nanoTime();
            tokens = Math.min(capacity, tokens + (now - last) * ratePerNano);
            last = now;
            if (tokens >= 1) {
                tokens -= 1;
                return 0;
            }
            return Math.max(1, (long) Math.ceil((1 - tokens) / ratePerNano / 1_000_000_000.0));
        }
    }
}
