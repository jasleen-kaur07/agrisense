package com.agrisense.advisory;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.github.tomakehurst.wiremock.client.WireMock;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;

class FarmFieldIT extends BaseIT {

    @Test
    void healthAndReady() {
        assertThat(GET("/health", null).getBody().get("status").asText()).isEqualTo("UP");
        assertThat(GET("/ready", null).getBody().get("status").asText()).isEqualTo("UP");
    }

    @Test
    void unauthenticatedGets401ProblemJson() {
        ResponseEntity<JsonNode> r = GET("/v1/farms", null);
        assertThat(r.getStatusCode().value()).isEqualTo(401);
        assertThat(r.getHeaders().getContentType().toString()).startsWith("application/problem+json");
        assertThat(r.getBody().get("title").asText()).isEqualTo("Unauthorized");
    }

    @Test
    void farmCrudOwnershipAndRequestIdPropagation() {
        UUID me = UUID.randomUUID(), other = UUID.randomUUID();
        String t = token(me, "FARMER"), o = token(other, "FARMER");
        String rid = "req-" + UUID.randomUUID();
        ResponseEntity<JsonNode> created = post("/v1/farms", t,
                Map.of("name", "North farm", "stateKey", "UTTAR PRADESH", "districtKey", "LUCKNOW"), "X-Request-ID", rid);
        assertThat(created.getStatusCode().value()).isEqualTo(201);
        assertThat(created.getHeaders().getFirst("X-Request-ID")).isEqualTo(rid);
        JsonNode farm = created.getBody();
        assertThat(farm.get("state").asText()).isEqualTo("Uttar Pradesh");
        assertThat(farm.get("district").asText()).isEqualTo("Lucknow");
        assertThat(farm.get("latitude").asDouble()).isEqualTo(26.85);
        assertThat(farm.has("ownerId")).isFalse();
        WM.verify(getRequestedFor(urlPathMatching("/v1/locations/.*/LUCKNOW"))
                .withHeader("X-Internal-Token", equalTo(INTERNAL)).withHeader("X-Request-ID", equalTo(rid)));

        String id = farm.get("id").asText();
        assertThat(GET("/v1/farms", t).getBody().size()).isEqualTo(1);
        assertThat(GET("/v1/farms", o).getBody().size()).isZero();
        assertThat(GET("/v1/farms/" + id, o).getStatusCode().value()).isEqualTo(404);
        Map<String, String> upd = Map.of("name", "Renamed", "stateKey", "UTTAR PRADESH", "districtKey", "LUCKNOW");
        assertThat(call(HttpMethod.PUT, "/v1/farms/" + id, o, upd).getStatusCode().value()).isEqualTo(404);
        assertThat(call(HttpMethod.DELETE, "/v1/farms/" + id, o, null).getStatusCode().value()).isEqualTo(404);
        assertThat(GET("/v1/farms/" + id + "/fields", o).getStatusCode().value()).isEqualTo(404);
        assertThat(post("/v1/farms/" + id + "/fields", o, Map.of("name", "x", "areaAcres", 1)).getStatusCode().value()).isEqualTo(404);
        ResponseEntity<JsonNode> put = call(HttpMethod.PUT, "/v1/farms/" + id, t, upd);
        assertThat(put.getStatusCode().value()).isEqualTo(200);
        assertThat(put.getBody().get("name").asText()).isEqualTo("Renamed");
        ResponseEntity<JsonNode> notFound = GET("/v1/farms/" + id, o);
        assertThat(notFound.getHeaders().getContentType().toString()).startsWith("application/problem+json");
        assertThat(call(HttpMethod.DELETE, "/v1/farms/" + id, t, null).getStatusCode().value()).isEqualTo(204);
        assertThat(GET("/v1/farms/" + id, t).getStatusCode().value()).isEqualTo(404);
    }

    @Test
    void unknownDistrictIs422WithFieldError() {
        ResponseEntity<JsonNode> r = post("/v1/farms", token(UUID.randomUUID(), "FARMER"),
                Map.of("name", "x", "stateKey", "NOWHERE", "districtKey", "ATLANTIS"));
        assertThat(r.getStatusCode().value()).isEqualTo(422);
        assertThat(r.getBody().get("errors").get(0).get("field").asText()).isEqualTo("districtKey");
        assertThat(r.getHeaders().getContentType().toString()).startsWith("application/problem+json");
    }

    @Test
    void blankNameIs422() {
        ResponseEntity<JsonNode> r = post("/v1/farms", token(UUID.randomUUID(), "FARMER"),
                Map.of("name", "", "stateKey", "UTTAR PRADESH", "districtKey", "LUCKNOW"));
        assertThat(r.getStatusCode().value()).isEqualTo(422);
        assertThat(r.getBody().get("errors").get(0).get("field").asText()).isEqualTo("name");
    }

    @Test
    void dataServiceDownGives503Problem() {
        WM.stubFor(get(urlPathMatching("/v1/locations/.*/LUCKNOW")).atPriority(1)
                .willReturn(aResponse().withFault(com.github.tomakehurst.wiremock.http.Fault.CONNECTION_RESET_BY_PEER)));
        ResponseEntity<JsonNode> r = post("/v1/farms", token(UUID.randomUUID(), "FARMER"),
                Map.of("name", "x", "stateKey", "UTTAR PRADESH", "districtKey", "LUCKNOW"));
        assertThat(r.getStatusCode().value()).isEqualTo(503);
        assertThat(r.getHeaders().getContentType().toString()).startsWith("application/problem+json");
        assertThat(r.getBody().get("traceId").asText()).isNotBlank();
    }

    @Test
    void soilIsOptionalAndPartialAndNeverInferred() {
        UUID me = UUID.randomUUID(), other = UUID.randomUUID();
        String t = token(me, "FARMER");
        String farmId = createFarm(t).get("id").asText();

        JsonNode noSoil = createField(t, farmId, Map.of("name", "Plain", "areaAcres", 3));
        assertThat(noSoil.has("soil")).isFalse();
        assertThat(noSoil.has("soilSource")).isFalse();
        assertThat(noSoil.get("farmName").asText()).isEqualTo("North farm");

        JsonNode partial = createField(t, farmId, Map.of("name", "Partial", "areaAcres", 1.25, "soil", Map.of("ph", 6.5)));
        assertThat(partial.get("soilSource").asText()).isEqualTo("USER");
        assertThat(partial.get("soil").get("ph").decimalValue()).isEqualByComparingTo("6.5");
        assertThat(partial.get("soil").has("nitrogen")).isFalse();
        assertThat(partial.get("soil").has("phosphorus")).isFalse();

        String fid = noSoil.get("id").asText();
        Map<String, Object> soil = new HashMap<>();
        soil.put("nitrogen", 12);
        soil.put("testedOn", "2026-09-01");
        ResponseEntity<JsonNode> put = call(HttpMethod.PUT, "/v1/fields/" + fid + "/soil", t, soil);
        assertThat(put.getStatusCode().value()).isEqualTo(200);
        assertThat(put.getBody().get("soil").get("nitrogen").decimalValue()).isEqualByComparingTo("12");
        assertThat(put.getBody().get("soil").has("ph")).isFalse();
        assertThat(call(HttpMethod.PUT, "/v1/fields/" + fid + "/soil", token(other, "FARMER"), soil).getStatusCode().value()).isEqualTo(404);
        assertThat(call(HttpMethod.PUT, "/v1/fields/" + fid + "/soil", t, Map.of("ph", 11)).getStatusCode().value()).isEqualTo(422);
        assertThat(call(HttpMethod.DELETE, "/v1/fields/" + fid + "/soil", t, null).getStatusCode().value()).isEqualTo(204);
        assertThat(GET("/v1/fields/" + fid, t).getBody().has("soil")).isFalse();
    }

    @Test
    void fieldValidationAndOwnership() {
        UUID me = UUID.randomUUID();
        String t = token(me, "FARMER"), o = token(UUID.randomUUID(), "FARMER");
        String farmId = createFarm(t).get("id").asText();
        assertThat(post("/v1/farms/" + farmId + "/fields", t, Map.of("name", "x", "areaAcres", 0)).getStatusCode().value()).isEqualTo(422);
        assertThat(post("/v1/farms/" + farmId + "/fields", t, Map.of("name", "x")).getStatusCode().value()).isEqualTo(422);
        JsonNode f = createField(t, farmId, Map.of("name", "ok", "areaAcres", 1));
        String id = f.get("id").asText();
        assertThat(GET("/v1/fields/" + id, o).getStatusCode().value()).isEqualTo(404);
        assertThat(GET("/v1/fields", o).getBody().size()).isZero();
        assertThat(GET("/v1/fields", t).getBody().size()).isEqualTo(1);
        assertThat(call(HttpMethod.PUT, "/v1/fields/" + id, o, Map.of("name", "z", "areaAcres", 2)).getStatusCode().value()).isEqualTo(404);
        assertThat(call(HttpMethod.DELETE, "/v1/fields/" + id, o, null).getStatusCode().value()).isEqualTo(404);
        ResponseEntity<JsonNode> upd = call(HttpMethod.PUT, "/v1/fields/" + id, t, Map.of("name", "renamed", "areaAcres", 4));
        assertThat(upd.getBody().get("name").asText()).isEqualTo("renamed");
        assertThat(call(HttpMethod.DELETE, "/v1/fields/" + id, t, null).getStatusCode().value()).isEqualTo(204);
    }

    @Test
    void deletingFarmKeepsRecommendationDetached() {
        String t = token(UUID.randomUUID(), "FARMER");
        JsonNode farm = createFarm(t);
        String fid = createField(t, farm.get("id").asText(), Map.of("name", "Plot Z", "areaAcres", 2)).get("id").asText();
        JsonNode rec = createRec(t, fid);
        assertThat(call(HttpMethod.DELETE, "/v1/farms/" + farm.get("id").asText(), t, null).getStatusCode().value()).isEqualTo(204);
        assertThat(GET("/v1/fields/" + fid, t).getStatusCode().value()).isEqualTo(404);
        JsonNode kept = GET("/v1/recommendations/" + rec.get("id").asText(), t).getBody();
        assertThat(kept.has("fieldId")).isFalse();
        assertThat(kept.get("fieldName").asText()).isEqualTo("Plot Z");
    }
}
