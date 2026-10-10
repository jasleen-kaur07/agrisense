package com.agrisense.gateway;

import static com.agrisense.gateway.TestSupport.*;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.reactive.server.WebTestClient;

/** ALLOWED_ORIGINS unset: no CORS, Origin check falls back to http://localhost:3000. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = "ALLOWED_ORIGINS=")
class GatewayDefaultsTest {

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        r.add("IDENTITY_SERVICE_URL", IDENTITY::url);
        r.add("FARM_ADVISORY_SERVICE_URL", FARM::url);
        r.add("DATA_SERVICE_URL", DATA::url);
        r.add("IDENTITY_JWKS_URL", TestSupport::jwksUrl);
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
    void foreignOriginRejectedByGatewayCheckAndNoCorsHeaders() {
        client.post().uri("/api/v1/auth/login").header("Origin", "http://evil.test")
                .contentType(MediaType.APPLICATION_JSON).bodyValue("{}")
                .exchange().expectStatus().isForbidden()
                .expectHeader().contentTypeCompatibleWith("application/problem+json")
                .expectHeader().doesNotExist("Access-Control-Allow-Origin");
        client.post().uri("/api/v1/auth/login").header("Origin", "http://localhost:3000")
                .contentType(MediaType.APPLICATION_JSON).bodyValue("{}")
                .exchange().expectStatus().isOk()
                .expectHeader().doesNotExist("Access-Control-Allow-Origin");
    }
}
