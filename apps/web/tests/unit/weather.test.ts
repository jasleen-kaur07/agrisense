import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import WeatherPanel from "@/components/weather/WeatherPanel.vue";
import WeatherStatusBadge from "@/components/weather/WeatherStatusBadge.vue";
import { i18n } from "@/i18n";
import type { Weather } from "@/lib/api/types";
import { setLocale } from "./helpers";

const live: Weather = {
  status: "LIVE", source: "Open-Meteo", attribution: "x", fetchedAt: "2026-10-10T05:00:00Z",
  current: { temperatureC: 31.5, humidityPct: 60, windKmh: 9, weatherCode: 2 },
  daily: [{ date: "2026-10-10", tempMaxC: 33, tempMinC: 22, precipitationSumMm: 1, weatherCode: 3 }],
};
const mountPanel = (weather: Weather) => mount(WeatherPanel, { props: { weather, variant: "full" }, global: { plugins: [i18n] } });

describe("weather", () => {
  beforeEach(() => setLocale("en"));

  it("badge shows only the status label", () => {
    const w = mount(WeatherStatusBadge, { props: { status: "CACHED" }, global: { plugins: [i18n] } });
    expect(w.get("[data-testid=weather-status]").text()).toBe("Cached");
  });

  for (const lang of ["en", "hi"] as const) {
    it(`UNAVAILABLE never renders numbers, even if the payload carries them (${lang})`, () => {
      setLocale(lang);
      const w = mountPanel({ ...live, status: "UNAVAILABLE", message: "Weather is unavailable." });
      expect(w.get("[data-testid=weather-status]").attributes("data-status")).toBe("UNAVAILABLE");
      expect(w.get("[data-testid=weather-unavailable]").text()).toBe("Weather is unavailable.");
      const text = w.text();
      expect(text).not.toMatch(/31|°|km\/h|\bmm\b/);
      expect(w.find("table").exists()).toBe(false);
      // Source and attribution stay visible.
      expect(text).toContain("Open-Meteo");
    });
  }

  it("UNAVAILABLE without a message falls back to the calm default text", () => {
    const w = mountPanel({ ...live, status: "UNAVAILABLE", message: null });
    expect(w.get("[data-testid=weather-unavailable]").text()).toMatch(/not available/i);
  });

  it("LIVE shows values, source, attribution and fetched time", () => {
    const w = mountPanel(live);
    const text = w.text();
    expect(text).toContain("31.5°C");
    expect(text).toContain("Open-Meteo");
    expect(text).toContain("Weather data by Open-Meteo.com");
    expect(text).toMatch(/Fetched/);
    expect(w.find("table").exists()).toBe(true);
    expect(w.get("[data-testid=weather-status]").text()).toBe("Live");
  });
});
