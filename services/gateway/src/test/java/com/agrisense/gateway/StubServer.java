package com.agrisense.gateway;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

/** Tiny stub downstream built on the JDK HTTP server; records the last request it saw. */
final class StubServer {

    record Recorded(String method, String path, Map<String, List<String>> headers, int bodyLength) {
        String header(String name) {
            List<String> v = headers.get(name.toLowerCase(Locale.ROOT));
            return v == null || v.isEmpty() ? null : v.get(0);
        }
    }

    private final HttpServer server;
    private final String name;
    private volatile Recorded last;
    private final AtomicInteger hits = new AtomicInteger();
    private volatile String jwksBody = "";

    StubServer(String name) {
        this.name = name;
        try {
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
        server.setExecutor(Executors.newCachedThreadPool());
        server.createContext("/", this::handle);
        server.start();
    }

    String url() {
        return "http://127.0.0.1:" + server.getAddress().getPort();
    }

    void setJwks(String body) {
        this.jwksBody = body;
    }

    Recorded last() {
        return last;
    }

    int hits() {
        return hits.get();
    }

    void reset() {
        last = null;
    }

    private void handle(HttpExchange ex) throws IOException {
        Map<String, List<String>> h = new HashMap<>();
        ex.getRequestHeaders().forEach((k, v) -> h.put(k.toLowerCase(Locale.ROOT), List.copyOf(v)));
        byte[] body = ex.getRequestBody().readAllBytes();
        String path = ex.getRequestURI().getRawPath();
        last = new Recorded(ex.getRequestMethod(), path, h, body.length);
        hits.incrementAndGet();

        int status = 200;
        String contentType = "application/json";
        String payload = "{\"service\":\"" + name + "\",\"path\":\"" + path + "\"}";
        if (path.equals("/.well-known/jwks.json")) {
            payload = jwksBody;
        } else if (path.endsWith("/slow")) {
            try {
                Thread.sleep(3000);
            } catch (InterruptedException ignored) {
                Thread.currentThread().interrupt();
            }
        } else if (path.endsWith("/problem")) {
            status = 422;
            contentType = "application/problem+json";
            payload = "{\"type\":\"https://agrisense.local/problems/validation\",\"title\":\"Validation failed\","
                    + "\"status\":422,\"detail\":\"downstream says no\"}";
        } else if (path.equals("/v1/auth/login")) {
            ex.getResponseHeaders().add("Set-Cookie", "as_access=AAA; Path=/; HttpOnly; SameSite=Strict");
            ex.getResponseHeaders().add("Set-Cookie", "as_csrf=CCC; Path=/; SameSite=Strict");
        } else if (path.equals("/v1/farms/cached")) {
            ex.getResponseHeaders().add("Cache-Control", "max-age=600");
        }
        byte[] out = payload.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().set("Content-Type", contentType);
        ex.sendResponseHeaders(status, out.length);
        try (OutputStream os = ex.getResponseBody()) {
            os.write(out);
        }
    }
}
