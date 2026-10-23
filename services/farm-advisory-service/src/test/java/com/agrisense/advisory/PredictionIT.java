package com.agrisense.advisory;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.github.tomakehurst.wiremock.client.WireMock;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

class PredictionIT extends BaseIT {
    static final Map<String, Object> BODY = Map.of("nitrogen", 90, "phosphorus", 42, "potassium", 43,
            "temperature", 21.0, "humidity", 82.0, "ph", 6.5, "rainfall", 203.0);

    @Test
    void forwardsFeaturesInModelOrderAndReturnsMlBody() {
        WM.stubFor(WireMock.post(urlPathEqualTo("/internal/v1/model1/predict")).willReturn(okJson(
                "{\"kind\":\"MODEL1_EXPERIMENTAL\",\"results\":[{\"rank\":1,\"crop\":\"rice\",\"modelScore\":0.9}]}")));
        ResponseEntity<JsonNode> r = post("/v1/predictions/crop", token(UUID.randomUUID(), "FARMER"), BODY);
        assertThat(r.getStatusCode().value()).isEqualTo(200);
        assertThat(r.getBody().get("kind").asText()).isEqualTo("MODEL1_EXPERIMENTAL");
        WM.verify(postRequestedFor(urlPathEqualTo("/internal/v1/model1/predict"))
                .withHeader("X-Internal-Token", equalTo(INTERNAL))
                .withRequestBody(matchingJsonPath("$.N", equalTo("90.0")))
                .withRequestBody(matchingJsonPath("$.ph", equalTo("6.5")))
                .withRequestBody(matchingJsonPath("$.rainfall", equalTo("203.0"))));
    }

    @Test
    void missingValueIsRejectedWithoutCallingMl() {
        Map<String, Object> partial = new java.util.HashMap<>(BODY);
        partial.remove("rainfall");
        ResponseEntity<JsonNode> r = post("/v1/predictions/crop", token(UUID.randomUUID(), "FARMER"), partial);
        assertThat(r.getStatusCode().value()).isEqualTo(422);
        WM.verify(0, postRequestedFor(urlPathEqualTo("/internal/v1/model1/predict")));
    }

    @Test
    void mlRangeErrorsArePassedThroughAsFieldErrors() {
        WM.stubFor(WireMock.post(urlPathEqualTo("/internal/v1/model1/predict")).willReturn(aResponse().withStatus(422)
                .withHeader("Content-Type", "application/problem+json")
                .withBody("{\"title\":\"Validation failed\",\"status\":422,\"errors\":[{\"field\":\"ph\",\"message\":\"outside the range\"}]}")));
        ResponseEntity<JsonNode> r = post("/v1/predictions/crop", token(UUID.randomUUID(), "FARMER"), BODY);
        assertThat(r.getStatusCode().value()).isEqualTo(422);
        assertThat(r.getBody().get("errors").get(0).get("field").asText()).isEqualTo("ph");
    }

    @Test
    void disabledOrDownMlIs503() {
        WM.stubFor(WireMock.post(urlPathEqualTo("/internal/v1/model1/predict")).willReturn(aResponse().withStatus(403)));
        assertThat(post("/v1/predictions/crop", token(UUID.randomUUID(), "FARMER"), BODY).getStatusCode().value()).isEqualTo(503);
        WM.stubFor(WireMock.post(urlPathEqualTo("/internal/v1/model1/predict")).willReturn(aResponse().withStatus(500)));
        assertThat(post("/v1/predictions/crop", token(UUID.randomUUID(), "FARMER"), BODY).getStatusCode().value()).isEqualTo(503);
    }

    @Test
    void requiresAuthentication() {
        assertThat(post("/v1/predictions/crop", null, BODY).getStatusCode().value()).isEqualTo(401);
    }
}
