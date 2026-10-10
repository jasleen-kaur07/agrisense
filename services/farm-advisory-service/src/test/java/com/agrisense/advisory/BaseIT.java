package com.agrisense.advisory;

import static com.github.tomakehurst.wiremock.client.WireMock.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.core.WireMockConfiguration;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
abstract class BaseIT {
    static final PostgreSQLContainer<?> PG = new PostgreSQLContainer<>("postgres:16-alpine");
    static final WireMockServer WM = new WireMockServer(WireMockConfiguration.options().dynamicPort());
    static final RSAKey RSA;
    static final ObjectMapper OM = new ObjectMapper();
    static final String INTERNAL = "test-internal-token";

    static {
        PG.start();
        WM.start();
        try {
            RSA = new RSAKeyGenerator(2048).keyID("test-key").generate();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        String url = PG.getJdbcUrl();
        r.add("spring.datasource.url", () -> url + (url.contains("?") ? "&" : "?") + "currentSchema=advisory");
        r.add("spring.datasource.username", PG::getUsername);
        r.add("spring.datasource.password", PG::getPassword);
        r.add("advisory.data.url", WM::baseUrl);
        r.add("advisory.data.internal-token", () -> INTERNAL);
        r.add("advisory.data.read-timeout-ms", () -> "1500");
        r.add("advisory.data.cb-min-calls", () -> "100000");
        r.add("advisory.security.jwks-url", () -> WM.baseUrl() + "/jwks.json");
        r.add("advisory.alerts.enabled", () -> "false");
    }

    @Autowired TestRestTemplate http;

    @BeforeEach
    void stubs() {
        WM.resetAll();
        WM.stubFor(get(urlPathEqualTo("/jwks.json")).willReturn(okJson(new JWKSet(RSA.toPublicJWK()).toString())));
        WM.stubFor(get(urlPathMatching("/v1/locations/.*")).atPriority(10).willReturn(aResponse().withStatus(404)
                .withHeader("Content-Type", "application/problem+json").withBody("{\"title\":\"nf\",\"status\":404,\"type\":\"x\"}")));
        WM.stubFor(get(urlPathMatching("/v1/locations/.*/LUCKNOW")).atPriority(1).willReturn(okJson(
                "{\"stateKey\":\"UTTAR PRADESH\",\"districtKey\":\"LUCKNOW\",\"state\":\"Uttar Pradesh\","
                        + "\"district\":\"Lucknow\",\"latitude\":26.85,\"longitude\":80.95}")));
        WM.stubFor(get(urlPathEqualTo("/v1/seasons/current")).willReturn(okJson(
                "{\"season\":\"KHARIF\",\"next\":\"RABI\",\"months\":[6,7,8,9,10],\"rule\":\"simplified\"}")));
        WM.stubFor(get(urlPathEqualTo("/v1/regional/guide")).willReturn(okJson(GUIDE)));
        stubWeather(weather("LIVE", 12.0, 33.0));
        WM.stubFor(get(urlPathEqualTo("/v1/regional/crop-history")).willReturn(okJson(HISTORY)));
    }

    static final String GUIDE = "{\"kind\":\"REGIONAL_PATTERN\",\"state\":\"Uttar Pradesh\",\"district\":\"Lucknow\","
            + "\"season\":\"KHARIF\",\"basis\":\"recency-weighted area share (historical prevalence)\",\"asOfYear\":2022,"
            + "\"crops\":[{\"rank\":1,\"crop\":\"Rice\",\"prevalencePct\":41.25,\"districtPct\":45.0,\"statePct\":30.1},"
            + "{\"rank\":2,\"crop\":\"Maize\",\"prevalencePct\":20.5,\"districtPct\":null,\"statePct\":20.5},"
            + "{\"rank\":3,\"crop\":\"Sugarcane\",\"prevalencePct\":10.0,\"districtPct\":9.0,\"statePct\":12.0},"
            + "{\"rank\":4,\"crop\":\"Bajra\",\"prevalencePct\":5.0,\"districtPct\":4.0,\"statePct\":6.0},"
            + "{\"rank\":5,\"crop\":\"Jowar\",\"prevalencePct\":2.0,\"districtPct\":1.0,\"statePct\":3.0}],"
            + "\"yearRoundCrops\":[\"Sugarcane\"],\"coverage\":{\"districtRecords\":40,\"yearsCovered\":[2020,2021,2022],"
            + "\"stateFallbackUsed\":true,\"districtWeight\":0.8,\"firstYear\":2020,\"lastYear\":2022},"
            + "\"caveats\":[\"Dataset caveat from data-service.\"],\"sources\":[\"test\"]}";

    static final String HISTORY = "{\"series\":[{\"crop\":\"Rice\",\"points\":[{\"year\":2018,\"sharePct\":40},{\"year\":2019,\"sharePct\":41.5},"
            + "{\"year\":2020,\"sharePct\":42},{\"year\":2021,\"sharePct\":43.25}]},"
            + "{\"crop\":\"Maize\",\"points\":[]}]}";

    static String weather(String status, double rainMax, double tempMax) {
        StringBuilder d = new StringBuilder();
        for (int i = 0; i < 7; i++) {
            if (i > 0) d.append(',');
            boolean peak = i == 1;
            d.append("{\"date\":\"2026-10-").append(11 + i).append("\",\"tempMaxC\":").append(peak ? tempMax : 30.0)
                    .append(",\"tempMinC\":22.0,\"precipitationSumMm\":").append(peak ? rainMax : 1.0)
                    .append(",\"precipitationProbabilityMaxPct\":50,\"weatherCode\":3}");
        }
        return "{\"status\":\"" + status + "\",\"source\":\"Open-Meteo\",\"attribution\":\"Weather data by Open-Meteo.com\","
                + "\"fetchedAt\":\"2026-10-10T08:00:00Z\",\"timezone\":\"Asia/Kolkata\",\"current\":{\"temperatureC\":30},"
                + "\"daily\":[" + d + "]}";
    }

    static void stubWeather(String json) {
        WM.stubFor(get(urlPathEqualTo("/v1/weather")).willReturn(okJson(json)));
    }

    static String token(UUID sub, String... roles) {
        try {
            JWTClaimsSet c = new JWTClaimsSet.Builder().subject(sub.toString()).issuer("agrisense-identity")
                    .claim("roles", List.of(roles)).jwtID(UUID.randomUUID().toString())
                    .expirationTime(new Date(System.currentTimeMillis() + 600_000)).issueTime(new Date()).build();
            SignedJWT jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(RSA.getKeyID()).build(), c);
            jwt.sign(new RSASSASigner(RSA));
            return jwt.serialize();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    ResponseEntity<JsonNode> call(HttpMethod m, String path, String token, Object body, String... headerKv) {
        HttpHeaders h = new HttpHeaders();
        if (token != null) h.setBearerAuth(token);
        h.setContentType(MediaType.APPLICATION_JSON);
        for (int i = 0; i + 1 < headerKv.length; i += 2) h.set(headerKv[i], headerKv[i + 1]);
        return http.exchange(path, m, new HttpEntity<>(body, h), JsonNode.class);
    }

    ResponseEntity<JsonNode> GET(String path, String token) { return call(HttpMethod.GET, path, token, null); }
    ResponseEntity<JsonNode> post(String path, String token, Object body, String... h) { return call(HttpMethod.POST, path, token, body, h); }

    JsonNode createFarm(String token) {
        ResponseEntity<JsonNode> r = post("/v1/farms", token, Map.of("name", "North farm", "stateKey", "UTTAR PRADESH", "districtKey", "LUCKNOW"));
        if (r.getStatusCode().value() != 201) throw new AssertionError("farm create failed " + r.getBody());
        return r.getBody();
    }

    JsonNode createField(String token, String farmId, Object body) {
        ResponseEntity<JsonNode> r = post("/v1/farms/" + farmId + "/fields", token, body);
        if (r.getStatusCode().value() != 201) throw new AssertionError("field create failed " + r.getBody());
        return r.getBody();
    }

    /** farm + field, returns field id */
    String fieldFor(String token) {
        JsonNode farm = createFarm(token);
        return createField(token, farm.get("id").asText(), Map.of("name", "Plot A", "areaAcres", 2.5)).get("id").asText();
    }

    JsonNode createRec(String token, String fieldId) {
        ResponseEntity<JsonNode> r = post("/v1/recommendations", token, Map.of("fieldId", fieldId));
        if (r.getStatusCode().value() != 201) throw new AssertionError("rec create failed " + r.getStatusCode() + " " + r.getBody());
        return r.getBody();
    }
}
