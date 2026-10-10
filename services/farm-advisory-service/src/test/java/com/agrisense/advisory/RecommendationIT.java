package com.agrisense.advisory;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.github.tomakehurst.wiremock.http.Fault;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;

class RecommendationIT extends BaseIT {

    private static List<String> texts(JsonNode arr) {
        List<String> l = new ArrayList<>();
        arr.forEach(n -> l.add(n.asText()));
        return l;
    }

    @Test
    void createWithLiveWeather() {
        String t = token(UUID.randomUUID(), "FARMER");
        String fid = fieldFor(t);
        String rid = "req-" + UUID.randomUUID();
        ResponseEntity<JsonNode> r = post("/v1/recommendations", t, Map.of("fieldId", fid), "X-Request-ID", rid);
        assertThat(r.getStatusCode().value()).isEqualTo(201);
        JsonNode b = r.getBody();
        assertThat(b.get("kind").asText()).isEqualTo("REGIONAL_PATTERN");
        assertThat(b.get("season").asText()).isEqualTo("KHARIF");
        assertThat(b.get("soilUsed").asBoolean()).isFalse();
        assertThat(b.get("weather").get("status").asText()).isEqualTo("LIVE");
        assertThat(b.get("regional").get("crops").get(0).get("crop").asText()).isEqualTo("Rice");
        assertThat(b.get("location").get("districtKey").asText()).isEqualTo("LUCKNOW");
        assertThat(b.get("dataVersions").get("regionalStatsLastYear").asInt()).isEqualTo(2022);
        List<String> lim = texts(b.get("limitations"));
        assertThat(lim).contains("Shows historical crop prevalence in your district, not whether a crop suits your field.",
                "Soil values were not used.", "Dataset caveat from data-service.");
        WM.verify(getRequestedFor(urlPathEqualTo("/v1/regional/guide")).withHeader("X-Internal-Token", equalTo(INTERNAL))
                .withHeader("X-Request-ID", equalTo(rid)).withQueryParam("season", equalTo("KHARIF"))
                .withQueryParam("state", equalTo("UTTAR PRADESH")));
        // stored verbatim: fetch again
        JsonNode again = GET("/v1/recommendations/" + b.get("id").asText(), t).getBody();
        assertThat(again.get("regional")).isEqualTo(OM.valueToTree(parse(GUIDE)));
    }

    private static JsonNode parse(String s) {
        try { return OM.readTree(s); } catch (Exception e) { throw new IllegalStateException(e); }
    }

    @Test
    void soilOnFieldNeverUsed() {
        String t = token(UUID.randomUUID(), "FARMER");
        String farmId = createFarm(t).get("id").asText();
        String fid = createField(t, farmId, Map.of("name", "S", "areaAcres", 1, "soil", Map.of("ph", 7))).get("id").asText();
        JsonNode rec = createRec(t, fid);
        assertThat(rec.get("soilUsed").asBoolean()).isFalse();
        assertThat(rec.toString()).doesNotContain("soil_ph").doesNotContain("\"ph\"");
    }

    @Test
    void explicitSeasonIsUsedAndInvalidRejected() {
        String t = token(UUID.randomUUID(), "FARMER");
        String fid = fieldFor(t);
        ResponseEntity<JsonNode> r = post("/v1/recommendations", t, Map.of("fieldId", fid, "season", "RABI"));
        assertThat(r.getStatusCode().value()).isEqualTo(201);
        assertThat(r.getBody().get("season").asText()).isEqualTo("RABI");
        WM.verify(getRequestedFor(urlPathEqualTo("/v1/regional/guide")).withQueryParam("season", equalTo("RABI")));
        assertThat(post("/v1/recommendations", t, Map.of("fieldId", fid, "season", "WINTER")).getStatusCode().value()).isEqualTo(422);
    }

    @Test
    void soilTestModeNotAvailable() {
        String t = token(UUID.randomUUID(), "FARMER");
        ResponseEntity<JsonNode> r = post("/v1/recommendations", t, Map.of("fieldId", fieldFor(t), "mode", "SOIL_TEST"));
        assertThat(r.getStatusCode().value()).isEqualTo(422);
        assertThat(r.getBody().get("errors").get(0).get("message").asText()).isEqualTo("mode SOIL_TEST is not available");
    }

    @Test
    void otherUsersFieldIs404() {
        String t = token(UUID.randomUUID(), "FARMER");
        String fid = fieldFor(t);
        assertThat(post("/v1/recommendations", token(UUID.randomUUID(), "FARMER"), Map.of("fieldId", fid)).getStatusCode().value()).isEqualTo(404);
    }

    @Test
    void weatherFailureStoresUnavailableAndStill201() {
        WM.stubFor(get(urlPathEqualTo("/v1/weather")).willReturn(aResponse().withStatus(500)));
        String t = token(UUID.randomUUID(), "FARMER");
        JsonNode rec = createRec(t, fieldFor(t));
        JsonNode w = rec.get("weather");
        assertThat(w.get("status").asText()).isEqualTo("UNAVAILABLE");
        assertThat(w.get("source").asText()).isEqualTo("Open-Meteo");
        assertThat(w.get("attribution").asText()).isEqualTo("Weather data by Open-Meteo.com");
        assertThat(w.get("message").asText()).isEqualTo("Weather is temporarily unavailable.");
        // and when the weather call is unreachable
        WM.stubFor(get(urlPathEqualTo("/v1/weather")).willReturn(aResponse().withFault(Fault.CONNECTION_RESET_BY_PEER)));
        assertThat(createRec(t, fieldFor(t)).get("weather").get("status").asText()).isEqualTo("UNAVAILABLE");
    }

    @Test
    void dataServiceUnavailableWeatherAnswerIsCopied() {
        stubWeather("{\"status\":\"UNAVAILABLE\",\"source\":\"Open-Meteo\",\"attribution\":\"Weather data by Open-Meteo.com\",\"message\":\"upstream said so\"}");
        String t = token(UUID.randomUUID(), "FARMER");
        JsonNode w = createRec(t, fieldFor(t)).get("weather");
        assertThat(w.get("status").asText()).isEqualTo("UNAVAILABLE");
        assertThat(w.get("message").asText()).isEqualTo("upstream said so");
    }

    @Test
    void weatherTimeoutStoresUnavailable() {
        WM.stubFor(get(urlPathEqualTo("/v1/weather")).willReturn(okJson(weather("LIVE", 1, 30)).withFixedDelay(3000)));
        String t = token(UUID.randomUUID(), "FARMER");
        assertThat(createRec(t, fieldFor(t)).get("weather").get("status").asText()).isEqualTo("UNAVAILABLE");
    }

    @Test
    void regionalFailureGives502Or503() {
        String t = token(UUID.randomUUID(), "FARMER");
        String fid = fieldFor(t);
        WM.stubFor(get(urlPathEqualTo("/v1/regional/guide")).willReturn(aResponse().withStatus(500)));
        ResponseEntity<JsonNode> r = post("/v1/recommendations", t, Map.of("fieldId", fid));
        assertThat(r.getStatusCode().value()).isEqualTo(502);
        assertThat(r.getHeaders().getContentType().toString()).startsWith("application/problem+json");
        WM.stubFor(get(urlPathEqualTo("/v1/regional/guide")).willReturn(aResponse().withFault(Fault.CONNECTION_RESET_BY_PEER)));
        assertThat(post("/v1/recommendations", t, Map.of("fieldId", fid)).getStatusCode().value()).isEqualTo(503);
        WM.stubFor(get(urlPathEqualTo("/v1/regional/guide")).willReturn(aResponse().withStatus(404)));
        assertThat(post("/v1/recommendations", t, Map.of("fieldId", fid)).getStatusCode().value()).isEqualTo(502);
        assertThat(GET("/v1/recommendations", t).getBody().get("totalItems").asInt()).isZero();
    }

    @Test
    void idempotencyKeyReplaysOriginal() {
        UUID me = UUID.randomUUID();
        String t = token(me, "FARMER");
        String fid = fieldFor(t);
        String key = UUID.randomUUID().toString();
        ResponseEntity<JsonNode> first = post("/v1/recommendations", t, Map.of("fieldId", fid), "Idempotency-Key", key);
        ResponseEntity<JsonNode> second = post("/v1/recommendations", t, Map.of("fieldId", fid), "Idempotency-Key", key);
        assertThat(first.getStatusCode().value()).isEqualTo(201);
        assertThat(second.getStatusCode().value()).isEqualTo(200);
        assertThat(second.getBody().get("id").asText()).isEqualTo(first.getBody().get("id").asText());
        WM.verify(1, getRequestedFor(urlPathEqualTo("/v1/regional/guide")));
        assertThat(GET("/v1/recommendations?fieldId=" + fid, t).getBody().get("totalItems").asInt()).isEqualTo(1);
        // same key from another user does not collide
        String t2 = token(UUID.randomUUID(), "FARMER");
        ResponseEntity<JsonNode> third = post("/v1/recommendations", t2, Map.of("fieldId", fieldFor(t2)), "Idempotency-Key", key);
        assertThat(third.getStatusCode().value()).isEqualTo(201);
        assertThat(third.getBody().get("id").asText()).isNotEqualTo(first.getBody().get("id").asText());
        assertThat(post("/v1/recommendations", t, Map.of("fieldId", fid), "Idempotency-Key", "not-a-uuid").getStatusCode().value()).isEqualTo(422);
    }

    @Test
    void historyPagingNewestFirstAndOwnership() {
        String t = token(UUID.randomUUID(), "FARMER");
        String fid = fieldFor(t), fid2 = fieldFor(t);
        String a = createRec(t, fid).get("id").asText();
        String b = createRec(t, fid).get("id").asText();
        String c = createRec(t, fid2).get("id").asText();
        JsonNode p0 = GET("/v1/recommendations?page=0&size=2", t).getBody();
        assertThat(p0.get("items").size()).isEqualTo(2);
        assertThat(p0.get("totalItems").asInt()).isEqualTo(3);
        assertThat(p0.get("totalPages").asInt()).isEqualTo(2);
        assertThat(p0.get("page").asInt()).isZero();
        assertThat(p0.get("size").asInt()).isEqualTo(2);
        assertThat(p0.get("items").get(0).get("id").asText()).isEqualTo(c);
        assertThat(p0.get("items").get(1).get("id").asText()).isEqualTo(b);
        JsonNode p1 = GET("/v1/recommendations?page=1&size=2", t).getBody();
        assertThat(p1.get("items").size()).isEqualTo(1);
        assertThat(p1.get("items").get(0).get("id").asText()).isEqualTo(a);
        assertThat(GET("/v1/recommendations?fieldId=" + fid2, t).getBody().get("totalItems").asInt()).isEqualTo(1);
        assertThat(GET("/v1/recommendations?size=1000", t).getBody().get("size").asInt()).isEqualTo(100);
        String o = token(UUID.randomUUID(), "FARMER");
        assertThat(GET("/v1/recommendations", o).getBody().get("totalItems").asInt()).isZero();
        assertThat(GET("/v1/recommendations/" + a, o).getStatusCode().value()).isEqualTo(404);
        assertThat(call(HttpMethod.DELETE, "/v1/recommendations/" + a, o, null).getStatusCode().value()).isEqualTo(404);
        assertThat(call(HttpMethod.DELETE, "/v1/recommendations/" + a, t, null).getStatusCode().value()).isEqualTo(204);
        assertThat(GET("/v1/recommendations/" + a, t).getStatusCode().value()).isEqualTo(404);
    }

    @Test
    void compareUsesOnlyDataDerivedRows() {
        String t = token(UUID.randomUUID(), "FARMER");
        String id = createRec(t, fieldFor(t)).get("id").asText();
        ResponseEntity<JsonNode> r = GET("/v1/recommendations/" + id + "/compare?crops=rice,MAIZE,sugarcane", t);
        assertThat(r.getStatusCode().value()).isEqualTo(200);
        JsonNode b = r.getBody();
        assertThat(texts(b.get("crops"))).containsExactly("Rice", "Maize", "Sugarcane");
        List<String> labels = new ArrayList<>();
        b.get("rows").forEach(row -> labels.add(row.get("label").asText()));
        assertThat(labels).containsExactly("Historical prevalence in this district + state fallback (%)", "District share (%)",
                "State share (%)", "Reported as year-round crop", "Share of recorded area by year");
        JsonNode rows = b.get("rows");
        assertThat(rows.get(0).get("values").get(0).asText()).isEqualTo("41.25");
        assertThat(rows.get(1).get("values").get(0).asText()).isEqualTo("45");
        assertThat(rows.get(1).get("values").get(1).isNull()).isTrue();
        assertThat(rows.get(2).get("values").get(2).asText()).isEqualTo("12");
        assertThat(texts(rows.get(3).get("values"))).containsExactly("no", "no", "yes");
        assertThat(rows.get(4).get("values").get(0).asText()).isEqualTo("2019: 41.5%; 2020: 42%; 2021: 43.25%");
        assertThat(rows.get(4).get("values").get(1).isNull()).isTrue();
        assertThat(rows.get(4).get("values").get(2).isNull()).isTrue();
        assertThat(texts(b.get("notes"))).contains("Prevalence is historical, not suitability.");
        String labelText = String.join("|", labels).toLowerCase();
        assertThat(labelText).doesNotContainPattern("water|yield|price|weather|rain|profit|suitab");
        WM.verify(getRequestedFor(urlPathEqualTo("/v1/regional/crop-history")).withQueryParam("crops", equalTo("Rice,Maize,Sugarcane")));
    }

    @Test
    void compareValidationAndHistoryFailure() {
        String t = token(UUID.randomUUID(), "FARMER");
        String id = createRec(t, fieldFor(t)).get("id").asText();
        String base = "/v1/recommendations/" + id + "/compare?crops=";
        assertThat(GET(base + "rice", t).getStatusCode().value()).isEqualTo(422);
        assertThat(GET(base + "rice,wheat", t).getStatusCode().value()).isEqualTo(422);
        assertThat(GET(base + "rice,maize,bajra,jowar,sugarcane", t).getStatusCode().value()).isEqualTo(422);
        assertThat(GET(base + "rice,rice", t).getStatusCode().value()).isEqualTo(422);
        assertThat(GET("/v1/recommendations/" + id + "/compare", t).getStatusCode().value()).isEqualTo(422);
        assertThat(GET(base + "rice,maize", token(UUID.randomUUID(), "FARMER")).getStatusCode().value()).isEqualTo(404);
        WM.stubFor(get(urlPathEqualTo("/v1/regional/crop-history")).willReturn(aResponse().withStatus(500)));
        ResponseEntity<JsonNode> r = GET(base + "rice,maize", t);
        assertThat(r.getStatusCode().value()).isEqualTo(200);
        assertThat(r.getBody().get("rows").get(4).get("values").get(0).isNull()).isTrue();
    }

    @Test
    void planContentRules() {
        stubWeather(weather("LIVE", 70.0, 41.5));
        String t = token(UUID.randomUUID(), "FARMER");
        String id = createRec(t, fieldFor(t)).get("id").asText();
        ResponseEntity<JsonNode> r = post("/v1/recommendations/" + id + "/plan", t, Map.of("crop", "sugarcane"));
        assertThat(r.getStatusCode().value()).isEqualTo(200);
        JsonNode b = r.getBody();
        assertThat(b.get("crop").asText()).isEqualTo("Sugarcane");
        assertThat(b.get("disclaimer").asText()).isEqualTo("This plan lists what the data shows and where to get verified guidance. It is not agronomic advice.");
        List<String> kinds = new ArrayList<>();
        List<String> urls = new ArrayList<>();
        b.get("items").forEach(i -> {
            kinds.add(i.get("kind").asText());
            if ("OFFICIAL_RESOURCE".equals(i.get("kind").asText())) {
                urls.add(i.get("source").get("url").asText());
                assertThat(i.get("source").get("type").asText()).isEqualTo("OFFICIAL_PORTAL");
                assertThat(i.get("detail").asText()).isEqualTo("Opens the official portal; AgriSense does not reproduce its content");
            }
            if ("CHECKLIST".equals(i.get("kind").asText())) {
                assertThat(i.get("source").get("type").asText()).isEqualTo("GENERAL");
            }
        });
        assertThat(kinds).contains("DATA_INSIGHT", "CHECKLIST", "OFFICIAL_RESOURCE");
        assertThat(urls).containsExactlyInAnyOrder("https://soilhealth.dac.gov.in", "https://pmfby.gov.in",
                "https://pmkisan.gov.in", "https://farmer.gov.in");
        String all = b.get("items").toString();
        assertThat(all).contains("ranked #3").contains("10.0%").contains("year-round")
                .contains("70.0 mm on 2026-10-12").contains("41.5 C").contains("status LIVE");
        JsonNode weatherItem = null;
        for (JsonNode i : b.get("items")) if ("WEATHER_FORECAST".equals(i.get("source").get("type").asText())) weatherItem = i;
        assertThat(weatherItem).isNotNull();
        assertThat(weatherItem.get("source").get("label").asText()).contains("LIVE");
        assertThat(all.toLowerCase()).doesNotContainPattern("dose|dosage|\\bkg\\b|litre|irrigat|yield|fertili[sz]er|pesticide|\\bprice|water requirement|\\b\\d+\\s*days?\\b|sow on|sowing date");
        assertThat(post("/v1/recommendations/" + id + "/plan", t, Map.of("crop", "wheat")).getStatusCode().value()).isEqualTo(422);
        assertThat(post("/v1/recommendations/" + id + "/plan", token(UUID.randomUUID(), "FARMER"), Map.of("crop", "rice")).getStatusCode().value()).isEqualTo(404);
        // reproducible
        assertThat(post("/v1/recommendations/" + id + "/plan", t, Map.of("crop", "Sugarcane")).getBody()).isEqualTo(b);
    }

    @Test
    void planWithUnavailableWeatherSaysSo() {
        WM.stubFor(get(urlPathEqualTo("/v1/weather")).willReturn(aResponse().withStatus(500)));
        String t = token(UUID.randomUUID(), "FARMER");
        String id = createRec(t, fieldFor(t)).get("id").asText();
        String all = post("/v1/recommendations/" + id + "/plan", t, Map.of("crop", "Rice")).getBody().toString();
        assertThat(all).contains("status UNAVAILABLE").contains("no forecast check was made");
    }
}
