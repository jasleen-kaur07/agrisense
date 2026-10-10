package com.agrisense.advisory;

import static org.assertj.core.api.Assertions.assertThat;

import com.agrisense.advisory.api.Dto.Comparison;
import com.agrisense.advisory.service.CompareBuilder;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.Test;

class CompareBuilderTest {
    static JsonNode json(String s) {
        try { return new ObjectMapper().readTree(s); } catch (Exception e) { throw new IllegalStateException(e); }
    }

    static final JsonNode GUIDE = json("{\"crops\":[{\"rank\":1,\"crop\":\"Rice\",\"prevalencePct\":40.126,\"districtPct\":null,\"statePct\":40.126},"
            + "{\"rank\":2,\"crop\":\"Wheat\",\"prevalencePct\":30,\"districtPct\":31.5,\"statePct\":20}],\"yearRoundCrops\":[\"wheat\"]}");

    @Test
    void canonicalIsCaseInsensitive() {
        assertThat(CompareBuilder.canonical(GUIDE, "rICE")).isEqualTo("Rice");
        assertThat(CompareBuilder.canonical(GUIDE, "Tea")).isNull();
    }

    @Test
    void rowsComeOnlyFromStoredData() {
        Comparison c = CompareBuilder.build(GUIDE, List.of("Rice", "Wheat"), null);
        assertThat(c.rows()).extracting("label").containsExactly(CompareBuilder.LABEL_PREVALENCE,
                CompareBuilder.LABEL_DISTRICT, CompareBuilder.LABEL_STATE, CompareBuilder.LABEL_YEAR_ROUND, CompareBuilder.LABEL_TREND);
        assertThat(c.rows().get(0).values()).containsExactly("40.13", "30");
        assertThat(c.rows().get(1).values()).containsExactly(null, "31.5");
        assertThat(c.rows().get(3).values()).containsExactly("no", "yes");
        assertThat(c.rows().get(4).values()).containsExactly(null, null);
        assertThat(c.notes()).contains(CompareBuilder.NOTE_NOT_SUITABILITY);
    }

    @Test
    void trendKeepsLastThreeYearsSorted() {
        JsonNode h = json("{\"series\":[{\"crop\":\"rice\",\"points\":[{\"year\":2022,\"sharePct\":4},{\"year\":2019,\"sharePct\":1},"
                + "{\"year\":2021,\"sharePct\":3},{\"year\":2020,\"sharePct\":2.5}]}]}");
        Comparison c = CompareBuilder.build(GUIDE, List.of("Rice", "Wheat"), h);
        assertThat(c.rows().get(4).values()).containsExactly("2020: 2.5%; 2021: 3%; 2022: 4%", null);
    }
}
