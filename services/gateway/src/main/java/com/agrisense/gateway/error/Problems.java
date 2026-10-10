package com.agrisense.gateway.error;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/** Writes RFC 7807 problem+json responses. */
public final class Problems {

    public static final String TRACE_ATTR = "agrisense.traceId";
    public static final MediaType PROBLEM_JSON = MediaType.parseMediaType("application/problem+json");
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final String BASE = "https://agrisense.local/problems/";

    private Problems() {}

    public static Mono<Void> write(ServerWebExchange exchange, int status, String type, String title, String detail) {
        return write(exchange, status, type, title, detail, Map.of());
    }

    public static Mono<Void> write(ServerWebExchange exchange, int status, String type, String title,
                                   String detail, Map<String, String> extraHeaders) {
        ServerHttpResponse response = exchange.getResponse();
        if (response.isCommitted()) {
            return Mono.empty();
        }
        response.setStatusCode(HttpStatusCode.valueOf(status));
        // Drop anything a partially processed downstream response may have set.
        response.getHeaders().remove("Content-Length");
        response.getHeaders().remove("Content-Encoding");
        response.getHeaders().remove("Transfer-Encoding");
        response.getHeaders().remove("Set-Cookie");
        response.getHeaders().setContentType(PROBLEM_JSON);
        extraHeaders.forEach((k, v) -> response.getHeaders().set(k, v));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("type", BASE + type);
        body.put("title", title);
        body.put("status", status);
        body.put("detail", detail);
        body.put("instance", exchange.getRequest().getPath().value());
        Object trace = exchange.getAttribute(TRACE_ATTR);
        body.put("traceId", trace == null ? "" : trace.toString());
        byte[] bytes;
        try {
            bytes = MAPPER.writeValueAsBytes(body);
        } catch (JsonProcessingException e) {
            bytes = "{}".getBytes(StandardCharsets.UTF_8);
        }
        response.getHeaders().setContentLength(bytes.length);
        DataBuffer buffer = response.bufferFactory().wrap(bytes);
        return response.writeWith(Mono.just(buffer));
    }
}
