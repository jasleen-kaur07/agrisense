package com.agrisense.gateway.filter;

import com.agrisense.gateway.config.GatewayProperties;
import com.agrisense.gateway.error.Problems;
import com.agrisense.gateway.jwt.JwtException;
import com.agrisense.gateway.jwt.JwtValidator;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.Arrays;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpCookie;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * Runs only for requests that matched a route (unknown paths are 404 before any auth decision).
 * Order of checks: Origin, CSRF, JWT, role.
 */
@Component
public class SecurityGlobalFilter implements GlobalFilter, Ordered {

    static final String ACCESS_COOKIE = "as_access";
    static final String CSRF_COOKIE = "as_csrf";
    static final String CSRF_HEADER = "X-CSRF-Token";
    private static final Set<String> PUBLIC_POST = Set.of(
            "/api/v1/auth/register", "/api/v1/auth/login", "/api/v1/auth/refresh",
            "/api/v1/auth/forgot", "/api/v1/auth/reset");
    private static final Set<String> CSRF_EXEMPT = Set.of(
            "/api/v1/auth/register", "/api/v1/auth/login", "/api/v1/auth/forgot", "/api/v1/auth/reset");
    private static final String LOGOUT = "/api/v1/auth/logout";

    private final GatewayProperties props;
    private final JwtValidator validator;

    public SecurityGlobalFilter(GatewayProperties props, JwtValidator validator) {
        this.props = props;
        this.validator = validator;
    }

    @Override
    public int getOrder() {
        return -1000;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest req = exchange.getRequest();
        HttpMethod method = req.getMethod();
        String path = FilterPaths.normalize(req.getPath().value());
        boolean unsafe = HttpMethod.POST.equals(method) || HttpMethod.PUT.equals(method)
                || HttpMethod.PATCH.equals(method) || HttpMethod.DELETE.equals(method);

        if (unsafe) {
            if (!originAllowed(req)) {
                return Problems.write(exchange, 403, "forbidden", "Forbidden", "Origin not allowed.");
            }
            if (!CSRF_EXEMPT.contains(path) && !csrfValid(req)) {
                return Problems.write(exchange, 403, "csrf", "CSRF check failed",
                        "Missing or invalid CSRF token.");
            }
        }

        boolean isPublic = HttpMethod.POST.equals(method) && PUBLIC_POST.contains(path);
        if (isPublic) {
            return chain.filter(exchange);
        }
        boolean optionalAuth = LOGOUT.equals(path);
        boolean admin = path.equals("/api/v1/admin") || path.startsWith("/api/v1/admin/");

        HttpCookie cookie = req.getCookies().getFirst(ACCESS_COOKIE);
        String token = cookie == null ? "" : cookie.getValue();
        if (token.isBlank()) {
            return optionalAuth ? chain.filter(exchange) : unauthorized(exchange, "Authentication required.");
        }
        return validator.validate(token).flatMap(principal -> {
            if (admin && !principal.roles().contains("ADMIN")) {
                return Problems.write(exchange, 403, "forbidden", "Forbidden", "Administrator role required.");
            }
            ServerHttpRequest mutated = req.mutate().headers(h -> {
                h.set(HttpHeaders.AUTHORIZATION, "Bearer " + token);
                dropAccessCookie(h);
            }).build();
            return chain.filter(exchange.mutate().request(mutated).build());
        }).onErrorResume(JwtException.class, e -> {
            if (optionalAuth) {
                ServerHttpRequest mutated = req.mutate().headers(SecurityGlobalFilter::dropAccessCookie).build();
                return chain.filter(exchange.mutate().request(mutated).build());
            }
            if (e.isUnavailable()) {
                return Problems.write(exchange, 503, "unavailable", "Service unavailable",
                        "Authentication keys are temporarily unavailable.");
            }
            return unauthorized(exchange, "Invalid or expired access token.");
        });
    }

    private static Mono<Void> unauthorized(ServerWebExchange exchange, String detail) {
        return Problems.write(exchange, 401, "unauthorized", "Unauthorized", detail);
    }

    /** The downstream gets the JWT via Authorization, not as a cookie. */
    private static void dropAccessCookie(HttpHeaders h) {
        List<String> cookies = h.get(HttpHeaders.COOKIE);
        if (cookies == null) {
            return;
        }
        String kept = cookies.stream()
                .flatMap(c -> Arrays.stream(c.split(";")))
                .map(String::trim)
                .filter(c -> !c.isEmpty() && !c.startsWith(ACCESS_COOKIE + "="))
                .collect(Collectors.joining("; "));
        if (kept.isEmpty()) {
            h.remove(HttpHeaders.COOKIE);
        } else {
            h.set(HttpHeaders.COOKIE, kept);
        }
    }

    private boolean csrfValid(ServerHttpRequest req) {
        String header = req.getHeaders().getFirst(CSRF_HEADER);
        HttpCookie cookie = req.getCookies().getFirst(CSRF_COOKIE);
        if (header == null || header.isEmpty() || cookie == null || cookie.getValue().isEmpty()) {
            return false;
        }
        return MessageDigest.isEqual(header.getBytes(StandardCharsets.UTF_8),
                cookie.getValue().getBytes(StandardCharsets.UTF_8));
    }

    private boolean originAllowed(ServerHttpRequest req) {
        List<String> allowed = props.effectiveOrigins();
        String origin = req.getHeaders().getFirst(HttpHeaders.ORIGIN);
        if (origin != null && !origin.isBlank()) {
            return allowed.contains(GatewayProperties.normalizeOrigin(origin));
        }
        String referer = req.getHeaders().getFirst(HttpHeaders.REFERER);
        if (referer == null || referer.isBlank()) {
            return false;
        }
        try {
            URI u = URI.create(referer.trim());
            if (u.getScheme() == null || u.getHost() == null) {
                return false;
            }
            String o = u.getScheme() + "://" + u.getHost() + (u.getPort() == -1 ? "" : ":" + u.getPort());
            return allowed.contains(GatewayProperties.normalizeOrigin(o));
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
