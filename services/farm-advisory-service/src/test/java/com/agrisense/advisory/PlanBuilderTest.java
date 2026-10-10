package com.agrisense.advisory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.agrisense.advisory.api.Dto.ActionPlan;
import com.agrisense.advisory.service.PlanBuilder;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

class PlanBuilderTest {
    static final JsonNode GUIDE = CompareBuilderTest.json("{\"district\":\"D\",\"state\":\"S\",\"season\":\"RABI\",\"basis\":\"b\","
            + "\"crops\":[{\"rank\":2,\"crop\":\"Wheat\",\"prevalencePct\":30,\"districtPct\":null,\"statePct\":20}],\"yearRoundCrops\":[]}");

    static JsonNode weather(String status, double rain, double temp) {
        return CompareBuilderTest.json("{\"status\":\"" + status + "\",\"daily\":[{\"date\":\"2026-10-11\",\"tempMaxC\":" + temp
                + ",\"precipitationSumMm\":" + rain + "}]}");
    }

    private String text(ActionPlan p) { return p.items().toString(); }

    @Test
    void thresholdsAreStatedWithNumbers() {
        ActionPlan p = PlanBuilder.build("wheat", GUIDE, weather("LIVE", 50.0, 40.0));
        assertThat(text(p)).contains("at or above the 50.0 mm check on 2026-10-11").contains("at or above the 40.0 C check")
                .contains("state fallback used").contains("not listed among year-round");
        ActionPlan q = PlanBuilder.build("wheat", GUIDE, weather("CACHED", 49.9, 39.9));
        assertThat(text(q)).contains("below the 50.0 mm check").contains("below the 40.0 C check").contains("status CACHED");
    }

    @Test
    void unavailableWeatherMakesNoChecks() {
        ActionPlan p = PlanBuilder.build("Wheat", GUIDE, weather("UNAVAILABLE", 99, 99));
        assertThat(text(p)).contains("no forecast check was made").doesNotContain("99.0");
        assertThat(PlanBuilder.build("Wheat", GUIDE, null).items()).isNotEmpty();
    }

    @Test
    void structureAndDisclaimer() {
        ActionPlan p = PlanBuilder.build("Wheat", GUIDE, weather("LIVE", 1, 1));
        assertThat(p.disclaimer()).isEqualTo(PlanBuilder.DISCLAIMER);
        assertThat(p.items().stream().filter(i -> i.kind().equals("OFFICIAL_RESOURCE")).count()).isEqualTo(4);
        assertThat(p.items().stream().filter(i -> i.kind().equals("CHECKLIST")).count()).isEqualTo(3);
        assertThatThrownBy(() -> PlanBuilder.build("Rice", GUIDE, null)).isInstanceOf(IllegalArgumentException.class);
    }
}
