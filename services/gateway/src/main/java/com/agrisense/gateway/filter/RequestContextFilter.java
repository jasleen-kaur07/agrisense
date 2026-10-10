package com.agrisense.gateway.filter;

import com.agrisense.gateway.error.Problems;
import com.agrisense.gateway.logging.RequestLog;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

/**
 * First filter in the chain: request id, header hygiene, path sanity, response security headers, access log.
 */
@Component
public class RequestContextFilter implements WebFilter, Ordered {

    public static final String REQUEST_ID = "X-Request-ID";
    private static final Pattern UUID_RE =
            Pattern.compile("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$");
    /** Headers only the gateway/identity may set; client copies are always dropped. */
    private static final List<String> STRIPPED = List.of(
            "X-User-Id", "X-User-Roles", "X-Internal-Token", "Authorization", REQUEST_ID);

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        ServerHttpRequest original = exchange.getRequest();
        String incoming = original.getHeaders().getFirst(REQUEST_ID);
        String traceId = incoming != null && UUID_RE.matcher(incoming.trim()).matches()
                ? UUID.fromString(incoming.trim()).toString()
                : UUID.randomUUID().toString();
        exchange.getAttributes().put(Problems.TRACE_ATTR, traceId);

        String path = original.getPath().value();
        String rawPath = original.getURI().getRawPath();
        boolean apiPath = path.startsWith("/api/") || path.equals("/api");

        exchange.getResponse().beforeCommit(() -> {
            HttpHeaders h = exchange.getResponse().getHeaders();
            h.set(REQUEST_ID, traceId);
            h.set("X-Content-Type-Options", "nosniff");
            h.set("X-Frame-Options", "DENY");
            h.set("Referrer-Policy", "strict-origin-when-cross-origin");
            if (apiPath) {
                h.set("Cache-Control", "no-store");
            }
            return Mono.empty();
        });

        long start = System.nanoTime();
        Mono<Void> result;
        if (isSuspiciousPath(rawPath)) {
            result = Problems.write(exchange, 400, "bad-request", "Bad request", "Invalid request path.");
        } else {
            ServerHttpRequest mutated = original.mutate().headers(h -> {
                STRIPPED.forEach(h::remove);
                h.keySet().removeIf(k -> k.toLowerCase(Locale.ROOT).startsWith("x-user-"));
                h.set(REQUEST_ID, traceId);
            }).build();
            result = chain.filter(exchange.mutate().request(mutated).build());
        }
        boolean quiet = path.equals("/health") || path.equals("/ready");
        return result.doFinally(sig -> {
            if (!quiet) {
                Integer status = exchange.getResponse().getStatusCode() == null
                        ? null : exchange.getResponse().getStatusCode().value();
                long ms = (System.nanoTime() - start) / 1_000_000;
                RequestLog.info(traceId, original.getMethod() + " " + path + " -> " + status + " (" + ms + " ms)");
            }
        });
    }

    /** Rejects path tricks that could make the gateway and a downstream disagree about the target. */
    static boolean isSuspiciousPath(String raw) {
        if (raw == null) {
            return false;
        }
        String p = raw.toLowerCase(Locale.ROOT);
        return p.contains("..") || p.contains("//") || p.contains("%2e") || p.contains("%2f")
                || p.contains("%5c") || p.contains("%00") || p.contains(";") || p.contains("\\");
    }
}
