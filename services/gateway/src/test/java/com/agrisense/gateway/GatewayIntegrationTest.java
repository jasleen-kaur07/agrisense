package com.agrisense.gateway;

import static com.agrisense.gateway.TestSupport.*;
import static org.assertj.core.api.Assertions.assertThat;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.reactive.server.WebTestClient;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class GatewayIntegrationTest {

    static final String ORIGIN = "http://app.test";

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        r.add("IDENTITY_SERVICE_URL", IDENTITY::url);
        r.add("FARM_ADVISORY_SERVICE_URL", FARM::url);
        r.add("DATA_SERVICE_URL", DATA::url);
        r.add("IDENTITY_JWKS_URL", TestSupport::jwksUrl);
        r.add("ALLOWED_ORIGINS", () -> ORIGIN + ",http://other.test");
        r.add("agrisense.jwks-unknown-kid-cooldown-seconds", () -> "0");
    }

    @org.springframework.boot.test.web.server.LocalServerPort
    int port;

    WebTestClient client;

    @org.junit.jupiter.api.BeforeEach
    void buildClient() {
        client = WebTestClient.bindToServer().baseUrl("http://localhost:" + port)
                .responseTimeout(java.time.Duration.ofSeconds(15)).build();
    }

    @BeforeEach
    void reset() {
        IDENTITY.reset();
        FARM.reset();
        DATA.reset();
    }

    // ---- health ----

    @Test
    void healthAndReadyDoNotNeedDownstreams() {
        client.get().uri("/health").exchange().expectStatus().isOk();
        client.get().uri("/ready").exchange().expectStatus().isOk()
                .expectBody().jsonPath("$.status").isEqualTo("UP");
        assertThat(IDENTITY.last()).isNull();
    }

    // ---- public routes ----

    @Test
    void publicLoginReachesIdentityWithoutTokenAndPassesSetCookieThrough() {
        client.post().uri("/api/v1/auth/login").header("Origin", ORIGIN)
                .contentType(MediaType.APPLICATION_JSON).bodyValue("{\"email\":\"a@b.c\"}")
                .exchange().expectStatus().isOk()
                .expectHeader().exists("X-Request-ID")
                .expectHeader().valueEquals("Set-Cookie",
                        "as_access=AAA; Path=/; HttpOnly; SameSite=Strict",
                        "as_csrf=CCC; Path=/; SameSite=Strict");
        StubServer.Recorded r = IDENTITY.last();
        assertThat(r).isNotNull();
        assertThat(r.path()).isEqualTo("/v1/auth/login");
        assertThat(r.header("authorization")).isNull();
    }

    @Test
    void loginStillGetsOriginCheck() {
        client.post().uri("/api/v1/auth/login").header("Origin", "http://evil.test")
                .contentType(MediaType.APPLICATION_JSON).bodyValue("{}")
                .exchange().expectStatus().isForbidden();
        client.post().uri("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON).bodyValue("{}")
                .exchange().expectStatus().isForbidden();
        assertThat(IDENTITY.last()).isNull();
    }

    // ---- JWT ----

    @Test
    void protectedRouteWithoutCookieIs401Problem() {
        client.get().uri("/api/v1/farms").exchange().expectStatus().isUnauthorized()
                .expectHeader().contentTypeCompatibleWith("application/problem+json")
                .expectBody()
                .jsonPath("$.status").isEqualTo(401)
                .jsonPath("$.type").isEqualTo("https://agrisense.local/problems/unauthorized")
                .jsonPath("$.traceId").isNotEmpty();
        assertThat(FARM.last()).isNull();
    }

    @Test
    void validCookieForwardsBearerAndRequestId() {
        String jwt = valid("FARMER");
        String rid = UUID.randomUUID().toString();
        client.get().uri("/api/v1/farms?page=0").cookie("as_access", jwt).cookie("as_csrf", "x")
                .header("X-Request-ID", rid)
                .exchange().expectStatus().isOk()
                .expectHeader().valueEquals("X-Request-ID", rid);
        StubServer.Recorded r = FARM.last();
        assertThat(r.path()).isEqualTo("/v1/farms");
        assertThat(r.header("authorization")).isEqualTo("Bearer " + jwt);
        assertThat(r.header("x-request-id")).isEqualTo(rid);
        assertThat(r.header("cookie")).doesNotContain("as_access");
    }

    @Test
    void invalidClientRequestIdIsReplaced() {
        var result = client.get().uri("/api/v1/farms").cookie("as_access", valid("FARMER"))
                .header("X-Request-ID", "not-a-uuid; drop table")
                .exchange().expectStatus().isOk().returnResult(String.class);
        String echoed = result.getResponseHeaders().getFirst("X-Request-ID");
        assertThat(echoed).isNotEqualTo("not-a-uuid; drop table");
        assertThat(UUID.fromString(echoed)).isNotNull();
        assertThat(FARM.last().header("x-request-id")).isEqualTo(echoed);
    }

    @Test
    void expiredWrongIssuerAndForgedTokensAre401() {
        String expired = token(KEY, "agrisense-identity", List.of("FARMER"), Instant.now().minusSeconds(3600));
        String wrongIssuer = token(KEY, "someone-else", List.of("FARMER"), Instant.now().plusSeconds(600));
        String forged = token(OTHER_KEY, "agrisense-identity", List.of("ADMIN"), Instant.now().plusSeconds(600));
        String hmac = hmacToken();
        for (String bad : List.of(expired, wrongIssuer, forged, hmac, "garbage.token.value", "x")) {
            client.get().uri("/api/v1/farms").cookie("as_access", bad)
                    .exchange().expectStatus().isUnauthorized();
        }
        assertThat(FARM.last()).isNull();
    }

    @Test
    void unknownKidTriggersJwksRefresh() {
        try {
            publishKeys(KEY, ROTATED_KEY);
            String jwt = token(ROTATED_KEY, "agrisense-identity", List.of("FARMER"), Instant.now().plusSeconds(60));
            client.get().uri("/api/v1/farms").cookie("as_access", jwt).exchange().expectStatus().isOk();
        } finally {
            publishKeys(KEY);
        }
    }

    // ---- admin ----

    @Test
    void adminRoutesNeedAdminRole() {
        client.get().uri("/api/v1/admin/users").cookie("as_access", valid("FARMER"))
                .exchange().expectStatus().isForbidden()
                .expectBody().jsonPath("$.type").isEqualTo("https://agrisense.local/problems/forbidden");
        client.get().uri("/api/v1/admin/stats").cookie("as_access", valid("FARMER"))
                .exchange().expectStatus().isForbidden();
        assertThat(IDENTITY.last()).isNull();
        assertThat(FARM.last()).isNull();

        String admin = valid("ADMIN");
        client.get().uri("/api/v1/admin/users").cookie("as_access", admin).exchange().expectStatus().isOk();
        assertThat(IDENTITY.last().path()).isEqualTo("/v1/admin/users");
        assertThat(IDENTITY.last().header("authorization")).isEqualTo("Bearer " + admin);
        client.get().uri("/api/v1/admin/stats").cookie("as_access", admin).exchange().expectStatus().isOk();
        assertThat(FARM.last().path()).isEqualTo("/v1/admin/stats");
        client.get().uri("/api/v1/admin/data/summary").cookie("as_access", admin).exchange().expectStatus().isOk();
        assertThat(DATA.last().path()).isEqualTo("/v1/admin/data/summary");
    }

    // ---- routing ----

    @Test
    void routingTableMapsPrefixesToOwners() {
        String jwt = valid("FARMER");
        for (String p : List.of("/api/v1/profile", "/api/v1/auth/me")) {
            client.get().uri(p).cookie("as_access", jwt).exchange().expectStatus().isOk();
            assertThat(IDENTITY.last().path()).isEqualTo(p.substring(4));
        }
        for (String p : List.of("/api/v1/farms/1/fields", "/api/v1/fields/2/soil", "/api/v1/recommendations/3",
                "/api/v1/alerts", "/api/v1/feedback")) {
            client.get().uri(p).cookie("as_access", jwt).exchange().expectStatus().isOk();
            assertThat(FARM.last().path()).isEqualTo(p.substring(4));
        }
        for (String p : List.of("/api/v1/locations/states", "/api/v1/regional/guide", "/api/v1/seasons/current",
                "/api/v1/weather")) {
            client.get().uri(p).cookie("as_access", jwt).exchange().expectStatus().isOk();
            assertThat(DATA.last().path()).isEqualTo(p.substring(4));
        }
    }

    @Test
    void unknownAndInternalPathsAre404Problem() {
        for (String p : List.of("/api/v1/nope", "/internal/anything", "/api/v1/internal/x", "/actuator/health",
                "/.well-known/jwks.json", "/api/.well-known/jwks.json", "/api/v1/auth-evil", "/v1/farms")) {
            client.get().uri(p).cookie("as_access", valid("ADMIN")).exchange()
                    .expectStatus().isNotFound()
                    .expectHeader().contentTypeCompatibleWith("application/problem+json")
                    .expectBody().jsonPath("$.status").isEqualTo(404).jsonPath("$.traceId").isNotEmpty();
        }
        client.get().uri("/api/v1/nope").exchange().expectStatus().isNotFound();
        assertThat(IDENTITY.last()).isNull();
        assertThat(FARM.last()).isNull();
        assertThat(DATA.last()).isNull();
    }

    @Test
    void pathTraversalIsRejected() {
        client.get().uri(java.net.URI.create("http://localhost:" + port + "/api/v1/farms/..%2f..%2finternal/x")).cookie("as_access", valid("ADMIN"))
                .exchange().expectStatus().isBadRequest();
        client.get().uri(java.net.URI.create("http://localhost:" + port + "/api/v1/farms/%2e%2e/auth/me")).cookie("as_access", valid("ADMIN"))
                .exchange().expectStatus().isBadRequest();
        client.get().uri(java.net.URI.create("http://localhost:" + port + "/api/v1/farms/../auth/me")).cookie("as_access", valid("ADMIN"))
                .exchange().expectStatus().isBadRequest();
        assertThat(FARM.last()).isNull();
        assertThat(IDENTITY.last()).isNull();
    }

    // ---- CSRF / Origin ----

    @Test
    void csrfMissingOrMismatchIs403AndMatchIsForwarded() {
        String jwt = valid("FARMER");
        client.post().uri("/api/v1/farms").header("Origin", ORIGIN).cookie("as_access", jwt)
                .cookie("as_csrf", "tok123").contentType(MediaType.APPLICATION_JSON).bodyValue("{}")
                .exchange().expectStatus().isForbidden()
                .expectBody().jsonPath("$.type").isEqualTo("https://agrisense.local/problems/csrf");
        client.post().uri("/api/v1/farms").header("Origin", ORIGIN).cookie("as_access", jwt)
                .cookie("as_csrf", "tok123").header("X-CSRF-Token", "tok124")
                .contentType(MediaType.APPLICATION_JSON).bodyValue("{}")
                .exchange().expectStatus().isForbidden();
        client.post().uri("/api/v1/farms").header("Origin", ORIGIN).cookie("as_access", jwt)
                .header("X-CSRF-Token", "tok123")
                .contentType(MediaType.APPLICATION_JSON).bodyValue("{}")
                .exchange().expectStatus().isForbidden();
        assertThat(FARM.last()).isNull();

        client.post().uri("/api/v1/farms").header("Origin", ORIGIN).cookie("as_access", jwt)
                .cookie("as_csrf", "tok123").header("X-CSRF-Token", "tok123")
                .contentType(MediaType.APPLICATION_JSON).bodyValue("{}")
                .exchange().expectStatus().isOk();
        assertThat(FARM.last().method()).isEqualTo("POST");
        assertThat(FARM.last().header("authorization")).isEqualTo("Bearer " + jwt);
    }

    @Test
    void safeMethodsAreNotCsrfChecked() {
        client.get().uri("/api/v1/farms").cookie("as_access", valid("FARMER")).exchange().expectStatus().isOk();
    }

    @Test
    void originMismatchIs403EvenWithValidCsrf() {
        client.post().uri("/api/v1/farms").header("Origin", "http://evil.test").cookie("as_access", valid("FARMER"))
                .cookie("as_csrf", "t").header("X-CSRF-Token", "t")
                .contentType(MediaType.APPLICATION_JSON).bodyValue("{}")
                .exchange().expectStatus().isForbidden();
        // neither Origin nor Referer
        client.post().uri("/api/v1/farms").cookie("as_access", valid("FARMER"))
                .cookie("as_csrf", "t").header("X-CSRF-Token", "t")
                .contentType(MediaType.APPLICATION_JSON).bodyValue("{}")
                .exchange().expectStatus().isForbidden();
        // Referer fallback
        client.post().uri("/api/v1/farms").header("Referer", ORIGIN + "/farms/new")
                .cookie("as_access", valid("FARMER"))
                .cookie("as_csrf", "t").header("X-CSRF-Token", "t")
                .contentType(MediaType.APPLICATION_JSON).bodyValue("{}")
                .exchange().expectStatus().isOk();
        client.post().uri("/api/v1/farms").header("Referer", "http://evil.test/x")
                .cookie("as_access", valid("FARMER"))
                .cookie("as_csrf", "t").header("X-CSRF-Token", "t")
                .contentType(MediaType.APPLICATION_JSON).bodyValue("{}")
                .exchange().expectStatus().isForbidden();
    }

    @Test
    void refreshIsPublicButNeedsCsrf() {
        client.post().uri("/api/v1/auth/refresh").header("Origin", ORIGIN).cookie("as_refresh", "r1")
                .exchange().expectStatus().isForbidden();
        client.post().uri("/api/v1/auth/refresh").header("Origin", ORIGIN).cookie("as_refresh", "r1")
                .cookie("as_csrf", "c").header("X-CSRF-Token", "c")
                .exchange().expectStatus().isOk();
        StubServer.Recorded r = IDENTITY.last();
        assertThat(r.path()).isEqualTo("/v1/auth/refresh");
        assertThat(r.header("authorization")).isNull();
        assertThat(r.header("cookie")).contains("as_refresh=r1");
    }

    @Test
    void logoutNeedsCsrfButToleratesExpiredAccessToken() {
        String expired = token(KEY, "agrisense-identity", List.of("FARMER"), Instant.now().minusSeconds(3600));
        client.post().uri("/api/v1/auth/logout").header("Origin", ORIGIN).cookie("as_access", expired)
                .exchange().expectStatus().isForbidden();
        client.post().uri("/api/v1/auth/logout").header("Origin", ORIGIN).cookie("as_access", expired)
                .cookie("as_csrf", "c").header("X-CSRF-Token", "c")
                .exchange().expectStatus().isOk();
        assertThat(IDENTITY.last().path()).isEqualTo("/v1/auth/logout");
        assertThat(IDENTITY.last().header("authorization")).isNull();
    }

    // ---- header hygiene ----

    @Test
    void spoofedInternalHeadersAreStripped() {
        String jwt = valid("FARMER");
        client.get().uri("/api/v1/farms").cookie("as_access", jwt)
                .header("X-User-Id", "00000000-0000-0000-0000-000000000001")
                .header("X-User-Roles", "ADMIN")
                .header("X-User-Whatever", "1")
                .header("X-Internal-Token", "secret")
                .header("Authorization", "Bearer evil")
                .exchange().expectStatus().isOk();
        StubServer.Recorded r = FARM.last();
        assertThat(r.header("x-user-id")).isNull();
        assertThat(r.header("x-user-roles")).isNull();
        assertThat(r.header("x-user-whatever")).isNull();
        assertThat(r.header("x-internal-token")).isNull();
        assertThat(r.header("authorization")).isEqualTo("Bearer " + jwt);
    }

    @Test
    void spoofedAuthorizationWithoutCookieStillRejected() {
        client.get().uri("/api/v1/farms").header("Authorization", "Bearer " + valid("ADMIN"))
                .exchange().expectStatus().isUnauthorized();
        assertThat(FARM.last()).isNull();
    }

    // ---- response behaviour ----

    @Test
    void securityHeadersPresent() {
        client.get().uri("/api/v1/farms/cached").cookie("as_access", valid("FARMER")).exchange()
                .expectStatus().isOk()
                .expectHeader().valueEquals("X-Content-Type-Options", "nosniff")
                .expectHeader().valueEquals("X-Frame-Options", "DENY")
                .expectHeader().valueEquals("Referrer-Policy", "strict-origin-when-cross-origin")
                .expectHeader().valueEquals("Cache-Control", "no-store");
        client.get().uri("/api/v1/nope").exchange().expectStatus().isNotFound()
                .expectHeader().valueEquals("X-Content-Type-Options", "nosniff")
                .expectHeader().valueEquals("Cache-Control", "no-store");
        client.get().uri("/health").exchange().expectHeader().valueEquals("X-Frame-Options", "DENY");
    }

    @Test
    void downstreamProblemJsonPassesThrough() {
        client.get().uri("/api/v1/farms/problem").cookie("as_access", valid("FARMER")).exchange()
                .expectStatus().isEqualTo(422)
                .expectHeader().contentTypeCompatibleWith("application/problem+json")
                .expectBody().jsonPath("$.detail").isEqualTo("downstream says no");
    }

    @Test
    void oversizedBodyIs413() {
        byte[] big = new byte[1024 * 1024 + 10];
        client.post().uri("/api/v1/farms").header("Origin", ORIGIN).cookie("as_access", valid("FARMER"))
                .cookie("as_csrf", "t").header("X-CSRF-Token", "t")
                .contentType(MediaType.APPLICATION_OCTET_STREAM).bodyValue(big)
                .exchange().expectStatus().isEqualTo(413);
        assertThat(FARM.last()).isNull();
    }

    // ---- CORS ----

    @Test
    void corsPreflightAllowsConfiguredOriginWithCredentials() {
        client.method(HttpMethod.OPTIONS).uri("/api/v1/farms")
                .header("Origin", ORIGIN).header("Access-Control-Request-Method", "POST")
                .header("Access-Control-Request-Headers", "content-type,x-csrf-token")
                .exchange().expectStatus().isOk()
                .expectHeader().valueEquals("Access-Control-Allow-Origin", ORIGIN)
                .expectHeader().valueEquals("Access-Control-Allow-Credentials", "true");
    }

    // ---- rate limit (keep last-ish; uses its own client IP) ----

    @Test
    void loginIsRateLimitedTo10PerMinutePerIp() {
        int ok = 0;
        for (int i = 0; i < 10; i++) {
            client.post().uri("/api/v1/auth/login").header("X-Forwarded-For", "203.0.113.50, 10.0.0.1")
                    .header("Origin", ORIGIN).contentType(MediaType.APPLICATION_JSON).bodyValue("{}")
                    .exchange().expectStatus().isOk();
            ok++;
        }
        assertThat(ok).isEqualTo(10);
        client.post().uri("/api/v1/auth/login").header("X-Forwarded-For", "203.0.113.50")
                .header("Origin", ORIGIN).contentType(MediaType.APPLICATION_JSON).bodyValue("{}")
                .exchange().expectStatus().isEqualTo(429)
                .expectHeader().exists("Retry-After")
                .expectHeader().contentTypeCompatibleWith("application/problem+json")
                .expectBody().jsonPath("$.type").isEqualTo("https://agrisense.local/problems/rate-limited");
        // another client is unaffected
        client.post().uri("/api/v1/auth/login").header("X-Forwarded-For", "203.0.113.51")
                .header("Origin", ORIGIN).contentType(MediaType.APPLICATION_JSON).bodyValue("{}")
                .exchange().expectStatus().isOk();
    }

    @Test
    void generalLimitIs120PerMinute() {
        for (int i = 0; i < 120; i++) {
            client.get().uri("/api/v1/nope").header("X-Forwarded-For", "198.51.100.7")
                    .exchange().expectStatus().isNotFound();
        }
        client.get().uri("/api/v1/nope").header("X-Forwarded-For", "198.51.100.7")
                .exchange().expectStatus().isEqualTo(429);
    }

    private static String hmacToken() {
        try {
            SignedJWT jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.HS256).keyID("k1").build(),
                    new JWTClaimsSet.Builder().issuer("agrisense-identity").subject("u")
                            .expirationTime(new Date(System.currentTimeMillis() + 60000)).build());
            jwt.sign(new MACSigner(new byte[32]));
            return jwt.serialize();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
