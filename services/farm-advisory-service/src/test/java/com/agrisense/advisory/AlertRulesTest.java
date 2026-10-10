package com.agrisense.advisory;

import static org.assertj.core.api.Assertions.assertThat;

import com.agrisense.advisory.service.AlertRules;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

class AlertRulesTest {
    private static JsonNode w(String status, String days) {
        return CompareBuilderTest.json("{\"status\":\"" + status + "\",\"daily\":[" + days + "]}");
    }

    private static String day(String date, double rain, double temp) {
        return "{\"date\":\"" + date + "\",\"precipitationSumMm\":" + rain + ",\"tempMaxC\":" + temp + "}";
    }

    @Test
    void boundaryValuesTrigger() {
        var t = AlertRules.evaluate(w("LIVE", day("2026-10-12", 64.5, 40.0)));
        assertThat(t).extracting("type").containsExactlyInAnyOrder("HEAVY_RAIN", "HIGH_TEMPERATURE");
    }

    @Test
    void belowThresholdNoAlert() {
        assertThat(AlertRules.evaluate(w("LIVE", day("2026-10-12", 64.4, 39.9)))).isEmpty();
    }

    @Test
    void unavailableOrMalformedYieldsNothing() {
        assertThat(AlertRules.evaluate(w("UNAVAILABLE", day("2026-10-12", 100, 50)))).isEmpty();
        assertThat(AlertRules.evaluate(null)).isEmpty();
        assertThat(AlertRules.evaluate(CompareBuilderTest.json("{\"status\":\"LIVE\"}"))).isEmpty();
    }

    @Test
    void peakAndWindowKey() {
        var t = AlertRules.evaluate(w("CACHED", day("2026-10-12", 70, 20) + "," + day("2026-10-13", 90, 20)));
        assertThat(t).hasSize(1);
        assertThat(t.get(0).peak()).isEqualTo(90.0);
        assertThat(t.get(0).peakDate().toString()).isEqualTo("2026-10-13");
        assertThat(t.get(0).days()).containsExactly("2026-10-12", "2026-10-13");
        assertThat(t.get(0).windowKey()).isEqualTo("2026-W42");
    }
}
