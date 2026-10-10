package com.agrisense.advisory.service;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDate;
import java.time.temporal.IsoFields;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Pure forecast rules for WATCH alerts. */
public final class AlertRules {
    private AlertRules() {}

    public static final double RAIN_MM = 64.5;
    public static final double TEMP_C = 40.0;

    public record Trigger(String type, String windowKey, LocalDate peakDate, double peak, List<String> days) {}

    public static List<Trigger> evaluate(JsonNode weather) {
        List<Trigger> out = new ArrayList<>();
        if (weather == null || !weather.isObject()) {
            return out;
        }
        String status = weather.path("status").asText("UNAVAILABLE");
        if (!"LIVE".equals(status) && !"CACHED".equals(status)) {
            return out;
        }
        JsonNode daily = weather.path("daily");
        if (!daily.isArray()) {
            return out;
        }
        trigger("HEAVY_RAIN", "precipitationSumMm", RAIN_MM, daily).ifPresent(out::add);
        trigger("HIGH_TEMPERATURE", "tempMaxC", TEMP_C, daily).ifPresent(out::add);
        return out;
    }

    private static java.util.Optional<Trigger> trigger(String type, String field, double threshold, JsonNode daily) {
        List<String> days = new ArrayList<>();
        LocalDate first = null, peakDate = null;
        double peak = Double.NEGATIVE_INFINITY;
        for (JsonNode d : daily) {
            if (!d.path(field).isNumber() || !d.path("date").isTextual()) {
                continue;
            }
            double v = d.path(field).asDouble();
            if (v >= threshold) {
                LocalDate date;
                try {
                    date = LocalDate.parse(d.path("date").asText());
                } catch (RuntimeException e) {
                    continue;
                }
                days.add(date.toString());
                if (first == null || date.isBefore(first)) first = date;
                if (v > peak) { peak = v; peakDate = date; }
            }
        }
        if (first == null) {
            return java.util.Optional.empty();
        }
        String window = first.get(IsoFields.WEEK_BASED_YEAR) + "-W" + String.format(Locale.ROOT, "%02d", first.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR));
        return java.util.Optional.of(new Trigger(type, window, peakDate, peak, days));
    }
}
