package com.agrisense.gateway;

import static com.agrisense.gateway.TestSupport.*;

import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.reactive.server.WebTestClient;

/** Valid JWKS, but a slow farm-advisory and a dead data-service. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "spring.cloud.gateway.server.webflux.httpclient.response-timeout=1s")
class GatewayDownstreamFailureTest {

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        r.add("IDENTITY_SERVICE_URL", IDENTITY::url);
        r.add("FARM_ADVISORY_SERVICE_URL", FARM::url);
        r.add("DATA_SERVICE_URL", () -> "http://127.0.0.1:" + closedPort());
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
    void slowDownstreamIs504Problem() {
        client.mutate().responseTimeout(Duration.ofSeconds(15)).build()
                .get().uri("/api/v1/farms/slow").cookie("as_access", valid("FARMER"))
                .exchange().expectStatus().isEqualTo(504)
                .expectHeader().contentTypeCompatibleWith("application/problem+json")
                .expectBody().jsonPath("$.type").isEqualTo("https://agrisense.local/problems/gateway-timeout");
    }

    @Test
    void refusedConnectionIs502Problem() {
        client.get().uri("/api/v1/weather").cookie("as_access", valid("FARMER"))
                .exchange().expectStatus().isEqualTo(502)
                .expectHeader().contentTypeCompatibleWith("application/problem+json")
                .expectBody().jsonPath("$.type").isEqualTo("https://agrisense.local/problems/bad-gateway");
    }
}
