package com.agrisense.advisory.service;

import com.agrisense.advisory.api.Dto.Comparison;
import com.agrisense.advisory.api.Dto.Row;
import com.fasterxml.jackson.databind.JsonNode;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;

/** Builds the comparison table using only data present in the stored guide (and optional crop history). */
public final class CompareBuilder {
    private CompareBuilder() {}

    public static final String LABEL_PREVALENCE = "Historical prevalence in this district + state fallback (%)";
    public static final String LABEL_DISTRICT = "District share (%)";
    public static final String LABEL_STATE = "State share (%)";
    public static final String LABEL_YEAR_ROUND = "Reported as year-round crop";
    public static final String LABEL_TREND = "Share of recorded area by year";
    public static final String NOTE_NOT_SUITABILITY = "Prevalence is historical, not suitability.";

    static String num(JsonNode n) {
        if (n == null || n.isNull() || n.isMissingNode() || !n.isNumber()) {
            return null;
        }
        return n.decimalValue().setScale(2, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
    }

    private static JsonNode findCrop(JsonNode regional, String crop) {
        for (JsonNode c : regional.path("crops")) {
            if (c.path("crop").asText().equalsIgnoreCase(crop)) {
                return c;
            }
        }
        return null;
    }

    /** Returns canonical crop names from the stored guide, or null entries for unknown names. */
    public static String canonical(JsonNode regional, String name) {
        JsonNode c = findCrop(regional, name);
        return c == null ? null : c.path("crop").asText();
    }

    static String trend(JsonNode history, String crop) {
        if (history == null) {
            return null;
        }
        for (JsonNode s : history.path("series")) {
            if (!s.path("crop").asText().equalsIgnoreCase(crop)) {
                continue;
            }
            Map<Integer, String> byYear = new TreeMap<>();
            for (JsonNode p : s.path("points")) {
                String v = num(p.path("sharePct"));
                if (p.path("year").isInt() && v != null) {
                    byYear.put(p.path("year").asInt(), v);
                }
            }
            if (byYear.isEmpty()) {
                return null;
            }
            List<String> parts = new ArrayList<>();
            byYear.entrySet().stream().skip(Math.max(0, byYear.size() - 3))
                    .forEach(e -> parts.add(e.getKey() + ": " + e.getValue() + "%"));
            return String.join("; ", parts);
        }
        return null;
    }

    /** @param crops canonical crop names (already validated against the guide); history may be null */
    public static Comparison build(JsonNode regional, List<String> crops, JsonNode history) {
        List<String> prev = new ArrayList<>(), dist = new ArrayList<>(), st = new ArrayList<>(),
                yr = new ArrayList<>(), tr = new ArrayList<>();
        Map<String, Boolean> yearRound = new java.util.HashMap<>();
        for (JsonNode y : regional.path("yearRoundCrops")) {
            yearRound.put(y.asText().toLowerCase(Locale.ROOT), true);
        }
        for (String crop : crops) {
            JsonNode c = findCrop(regional, crop);
            prev.add(c == null ? null : num(c.path("prevalencePct")));
            dist.add(c == null ? null : num(c.path("districtPct")));
            st.add(c == null ? null : num(c.path("statePct")));
            yr.add(yearRound.containsKey(crop.toLowerCase(Locale.ROOT)) ? "yes" : "no");
            tr.add(trend(history, crop));
        }
        List<Row> rows = List.of(
                new Row(LABEL_PREVALENCE, prev, "Regional Crop Guide (stored snapshot)"),
                new Row(LABEL_DISTRICT, dist, "Regional Crop Guide (stored snapshot)"),
                new Row(LABEL_STATE, st, "Regional Crop Guide (stored snapshot)"),
                new Row(LABEL_YEAR_ROUND, yr, "Regional Crop Guide (stored snapshot)"),
                new Row(LABEL_TREND, tr, "Regional crop history (data-service, fetched for this comparison)"));
        List<String> notes = new ArrayList<>();
        notes.add(NOTE_NOT_SUITABILITY);
        notes.add("A blank district share means the state-level fallback was used for that crop.");
        notes.add("Yearly shares are the crop's share of recorded cropped area in the district across all seasons; "
                + "a dash means the history was not available.");
        return new Comparison(List.copyOf(crops), rows, notes);
    }

}
