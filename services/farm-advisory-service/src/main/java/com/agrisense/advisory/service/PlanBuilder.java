package com.agrisense.advisory.service;

import com.agrisense.advisory.api.Dto.ActionPlan;
import com.agrisense.advisory.api.Dto.PlanItem;
import com.agrisense.advisory.api.Dto.Source;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Deterministic: the plan is a pure function of the stored recommendation (guide + weather snapshot). */
public final class PlanBuilder {
    private PlanBuilder() {}

    public static final String DISCLAIMER =
            "This plan lists what the data shows and where to get verified guidance. It is not agronomic advice.";
    public static final double RAIN_MM = 50.0;
    public static final double TEMP_C = 40.0;
    public static final String PORTAL_DETAIL = "Opens the official portal; AgriSense does not reproduce its content";

    private static String fmt(double v) {
        return String.format(Locale.ROOT, "%.1f", v);
    }

    public static ActionPlan build(String crop, JsonNode regional, JsonNode weather) {
        JsonNode entry = null;
        for (JsonNode c : regional.path("crops")) {
            if (c.path("crop").asText().equalsIgnoreCase(crop)) {
                entry = c;
            }
        }
        if (entry == null) {
            throw new IllegalArgumentException("crop not in guide");
        }
        String name = entry.path("crop").asText();
        List<PlanItem> items = new ArrayList<>();

        String dist = entry.path("districtPct").isNumber()
                ? "district share " + fmt(entry.path("districtPct").asDouble()) + "%"
                : "district share not available (state fallback used)";
        items.add(new PlanItem("DATA_INSIGHT", "Regional rank and historical prevalence",
                name + " is ranked #" + entry.path("rank").asInt() + " in the Regional Crop Guide for "
                        + regional.path("district").asText() + ", " + regional.path("state").asText() + " ("
                        + regional.path("season").asText() + "), with historical prevalence of "
                        + fmt(entry.path("prevalencePct").asDouble()) + "% of recorded cropped area ("
                        + dist + ", state share " + fmt(entry.path("statePct").asDouble())
                        + "%). This is historical prevalence, not suitability.",
                new Source("REGIONAL_DATA", "Regional Crop Guide: " + regional.path("basis").asText("historical prevalence"), null)));

        boolean yearRound = false;
        for (JsonNode y : regional.path("yearRoundCrops")) {
            if (y.asText().equalsIgnoreCase(name)) {
                yearRound = true;
            }
        }
        items.add(new PlanItem("DATA_INSIGHT", "Year-round crop in the regional data",
                yearRound ? name + " is reported as a year-round (whole year) crop in the regional records."
                        : name + " is not listed among year-round crops in the regional records.",
                new Source("REGIONAL_DATA", "Regional Crop Guide (yearRoundCrops)", null)));

        items.add(weatherItem(weather));

        items.add(new PlanItem("CHECKLIST", "Confirm local sowing window and variety",
                "Confirm the sowing window and variety with your local Krishi Vigyan Kendra or agriculture office.",
                new Source("GENERAL", "General process step", null)));
        items.add(new PlanItem("CHECKLIST", "Get a soil test and record it",
                "Get a soil test done and record the results in the app. Soil values are optional and are not used in this regional guide.",
                new Source("GENERAL", "General process step", null)));
        items.add(new PlanItem("CHECKLIST", "Check the forecast again before field work",
                "Check the latest weather forecast again before starting field work.",
                new Source("GENERAL", "General process step", null)));

        items.add(portal("Soil Health Card portal", "https://soilhealth.dac.gov.in"));
        items.add(portal("PM Fasal Bima Yojana portal", "https://pmfby.gov.in"));
        items.add(portal("PM-KISAN portal", "https://pmkisan.gov.in"));
        items.add(portal("Farmers Portal", "https://farmer.gov.in"));
        return new ActionPlan(name, items, DISCLAIMER);
    }

    private static PlanItem portal(String label, String url) {
        return new PlanItem("OFFICIAL_RESOURCE", label, PORTAL_DETAIL, new Source("OFFICIAL_PORTAL", label, url));
    }

    private static PlanItem weatherItem(JsonNode weather) {
        String status = weather == null ? "UNAVAILABLE" : weather.path("status").asText("UNAVAILABLE");
        JsonNode daily = weather == null ? null : weather.path("daily");
        Source src = new Source("WEATHER_FORECAST", "Open-Meteo forecast (status " + status + ")", null);
        boolean usable = !"UNAVAILABLE".equals(status) && daily != null && daily.isArray() && daily.size() > 0;
        if (!usable) {
            return new PlanItem("DATA_INSIGHT", "Weather forecast check",
                    "The 7-day forecast was unavailable when this guide was created (status " + status
                            + "), so no forecast check was made.", src);
        }
        double maxRain = Double.NEGATIVE_INFINITY, maxTemp = Double.NEGATIVE_INFINITY;
        String rainDate = null, tempDate = null;
        List<String> rainDays = new ArrayList<>(), hotDays = new ArrayList<>();
        for (JsonNode d : daily) {
            if (d.path("precipitationSumMm").isNumber()) {
                double r = d.path("precipitationSumMm").asDouble();
                if (r > maxRain) { maxRain = r; rainDate = d.path("date").asText(); }
                if (r >= RAIN_MM) rainDays.add(d.path("date").asText());
            }
            if (d.path("tempMaxC").isNumber()) {
                double t = d.path("tempMaxC").asDouble();
                if (t > maxTemp) { maxTemp = t; tempDate = d.path("date").asText(); }
                if (t >= TEMP_C) hotDays.add(d.path("date").asText());
            }
        }
        StringBuilder sb = new StringBuilder("In the forecast saved with this guide (status " + status + "): ");
        if (rainDate != null) {
            sb.append("highest daily precipitation ").append(fmt(maxRain)).append(" mm on ").append(rainDate).append(rainDays.isEmpty()
                    ? " (below the " + fmt(RAIN_MM) + " mm check)" : " (at or above the " + fmt(RAIN_MM) + " mm check on " + String.join(", ", rainDays) + ")").append("; ");
        }
        if (tempDate != null) {
            sb.append("highest daily maximum temperature ").append(fmt(maxTemp)).append(" C on ").append(tempDate).append(hotDays.isEmpty()
                    ? " (below the " + fmt(TEMP_C) + " C check)" : " (at or above the " + fmt(TEMP_C) + " C check on " + String.join(", ", hotDays) + ")").append(".");
        }
        sb.append(" Forecasts change; check the latest forecast.");
        return new PlanItem("DATA_INSIGHT", "Weather forecast check", sb.toString(), src);
    }
}
