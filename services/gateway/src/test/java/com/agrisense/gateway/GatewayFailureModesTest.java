package com.agrisense.gateway;

import static com.agrisense.gateway.TestSupport.*;

import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.reactive.server.WebTestClient;

/** Short response timeout, dead data-service and unreachable JWKS. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "spring.cloud.gateway.server.webflux.httpclient.response-timeout=1s")
class GatewayFailureModesTest {

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        r.add("IDENTITY_SERVICE_URL", IDENTITY::url);
        r.add("FARM_ADVISORY_SERVICE_URL", FARM::url);
        r.add("DATA_SERVICE_URL", () -> "http://127.0.0.1:" + closedPort());
        r.add("IDENTITY_JWKS_URL", () -> "http://127.0.0.1:" + closedPort() + "/.well-known/jwks.json");
        r.add("ALLOWED_ORIGINS", () -> "http://app.test");
    }

    @org.springframework.boot.test.web.server.LocalServerPort
    int port;

    WebTestClient client;

    @org.junit.jupiter.api.BeforeEach
    void buildClient() {
        client = WebTestClient.bindToServer().baseUrl("http://localhost:" + port)
                .responseTimeout(java.time.Duration.ofSeconds(15)).build();
    }

    @Test
    void jwksUnreachableWithEmptyCacheFailsClosedWith503ButPublicRoutesWork() {
        client.mutate().responseTimeout(Duration.ofSeconds(15)).build()
                .get().uri("/api/v1/farms").cookie("as_access", valid("FARMER"))
                .exchange().expectStatus().isEqualTo(503)
                .expectHeader().contentTypeCompatibleWith("application/problem+json")
                .expectBody().jsonPath("$.status").isEqualTo(503);
        client.post().uri("/api/v1/auth/login").header("Origin", "http://app.test")
                .contentType(MediaType.APPLICATION_JSON).bodyValue("{}")
                .exchange().expectStatus().isOk();
    }
}
