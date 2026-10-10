package com.agrisense.advisory;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.assertj.core.api.Assertions.assertThat;

import com.agrisense.advisory.service.AlertService;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;

class AdminAlertsIT extends BaseIT {
    @Autowired AlertService alertService;

    @Test
    void adminEndpointsForbiddenForFarmers() {
        String f = token(UUID.randomUUID(), "FARMER");
        for (String p : new String[]{"/v1/admin/feedback", "/v1/admin/recommendations", "/v1/admin/stats"}) {
            ResponseEntity<JsonNode> r = GET(p, f);
            assertThat(r.getStatusCode().value()).as(p).isEqualTo(403);
            assertThat(r.getHeaders().getContentType().toString()).startsWith("application/problem+json");
        }
        assertThat(GET("/v1/admin/stats", null).getStatusCode().value()).isEqualTo(401);
    }

    @Test
    void adminViewsAndFeedback() {
        UUID farmer = UUID.randomUUID();
        String t = token(farmer, "FARMER");
        String farmId = createFarm(t).get("id").asText();
        String fid = createField(t, farmId, Map.of("name", "S", "areaAcres", 1, "soil", Map.of("ph", 6.1, "nitrogen", 9))).get("id").asText();
        createRec(t, fid);
        assertThat(post("/v1/feedback", t, Map.of("category", "IDEA", "message", "please add more", "rating", 5)).getStatusCode().value()).isEqualTo(201);
        assertThat(post("/v1/feedback", t, Map.of("category", "NOPE", "message", "please add more")).getStatusCode().value()).isEqualTo(422);
        assertThat(post("/v1/feedback", t, Map.of("category", "BUG", "message", "abc")).getStatusCode().value()).isEqualTo(422);
        assertThat(post("/v1/feedback", t, Map.of("category", "BUG", "message", "valid message", "rating", 6)).getStatusCode().value()).isEqualTo(422);

        String a = token(UUID.randomUUID(), "ADMIN");
        JsonNode recs = GET("/v1/admin/recommendations?size=100", a).getBody();
        assertThat(recs.get("totalItems").asInt()).isGreaterThanOrEqualTo(1);
        boolean found = false;
        for (JsonNode r : recs.get("items")) {
            if (farmer.toString().equals(r.path("ownerId").asText())) found = true;
        }
        assertThat(found).isTrue();
        assertThat(recs.toString().toLowerCase()).doesNotContain("soil_").doesNotContain("nitrogen");
        JsonNode fb = GET("/v1/admin/feedback", a).getBody();
        assertThat(fb.get("totalItems").asInt()).isGreaterThanOrEqualTo(1);
        JsonNode stats = GET("/v1/admin/stats", a).getBody();
        assertThat(stats.get("farms").asInt()).isGreaterThanOrEqualTo(1);
        assertThat(stats.get("fields").asInt()).isGreaterThanOrEqualTo(1);
        assertThat(stats.get("recommendations").asInt()).isGreaterThanOrEqualTo(1);
        assertThat(stats.get("feedback").asInt()).isGreaterThanOrEqualTo(1);
    }

    @Test
    void alertJobCreatesDedupedHeavyRainAlert() {
        stubWeather(weather("LIVE", 70.0, 33.0));
        UUID me = UUID.randomUUID();
        String t = token(me, "FARMER");
        createFarm(t);
        alertService.runOnce();
        alertService.runOnce();
        JsonNode alerts = GET("/v1/alerts", t).getBody();
        assertThat(alerts.size()).isEqualTo(1);
        JsonNode al = alerts.get(0);
        assertThat(al.get("type").asText()).isEqualTo("HEAVY_RAIN");
        assertThat(al.get("severity").asText()).isEqualTo("WATCH");
        assertThat(al.get("read").asBoolean()).isFalse();
        assertThat(al.get("message").asText()).contains("70.0 mm").contains("Open-Meteo forecast (status LIVE)");
        assertThat(al.get("source").asText()).isEqualTo("Open-Meteo forecast (status LIVE)");
        WM.verify(getRequestedFor(urlPathEqualTo("/v1/weather")).withHeader("X-Internal-Token", equalTo(INTERNAL))
                .withHeader("X-Request-ID", matching(".+")));

        String id = al.get("id").asText();
        assertThat(post("/v1/alerts/" + id + "/read", token(UUID.randomUUID(), "FARMER"), null).getStatusCode().value()).isEqualTo(404);
        assertThat(post("/v1/alerts/" + id + "/read", t, null).getStatusCode().value()).isEqualTo(204);
        assertThat(GET("/v1/alerts?unreadOnly=true", t).getBody().size()).isZero();
        assertThat(GET("/v1/alerts", t).getBody().get(0).get("read").asBoolean()).isTrue();
    }

    @Test
    void alertJobHighTemperatureAndNoAlertsWhenUnavailableOrBelowThreshold() {
        stubWeather(weather("CACHED", 10.0, 42.0));
        String t = token(UUID.randomUUID(), "FARMER");
        createFarm(t);
        alertService.runOnce();
        JsonNode alerts = GET("/v1/alerts", t).getBody();
        assertThat(alerts.size()).isEqualTo(1);
        assertThat(alerts.get(0).get("type").asText()).isEqualTo("HIGH_TEMPERATURE");
        assertThat(alerts.get(0).get("message").asText()).contains("42.0 C").contains("status CACHED");

        stubWeather(weather("UNAVAILABLE", 99.0, 45.0));
        String u = token(UUID.randomUUID(), "FARMER");
        createFarm(u);
        alertService.runOnce();
        assertThat(GET("/v1/alerts", u).getBody().size()).isZero();

        WM.stubFor(get(urlPathEqualTo("/v1/weather")).willReturn(aResponse().withStatus(500)));
        alertService.runOnce();
        assertThat(GET("/v1/alerts", u).getBody().size()).isZero();
    }
}
