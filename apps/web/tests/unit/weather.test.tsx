import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WeatherStatusBadge } from "@/components/weather/WeatherStatusBadge";
import { WeatherPanel } from "@/components/weather/WeatherPanel";
import type { Weather } from "@/lib/api/types";

const live: Weather = {
  status: "LIVE", source: "Open-Meteo", attribution: "x", fetchedAt: "2026-10-10T05:00:00Z",
  current: { temperatureC: 31.5, humidityPct: 60, windKmh: 9, weatherCode: 2 },
  daily: [{ date: "2026-10-10", tempMaxC: 33, tempMinC: 22, precipitationSumMm: 1, weatherCode: 3 }],
};

describe("weather", () => {
  it("badge shows only the status label", () => {
    render(<WeatherStatusBadge status="CACHED" />);
    expect(screen.getByTestId("weather-status")).toHaveTextContent("Cached");
  });

  it("UNAVAILABLE never renders numbers, even if the payload carries them", () => {
    const { container } = render(
      <WeatherPanel weather={{ ...live, status: "UNAVAILABLE", message: "Weather is unavailable." }} variant="full" />,
    );
    expect(screen.getByTestId("weather-status")).toHaveTextContent("Unavailable");
    expect(screen.getByTestId("weather-unavailable")).toHaveTextContent("Weather is unavailable.");
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/31|°|km\/h|mm/);
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("LIVE shows values, source, attribution and fetched time", () => {
    const { container } = render(<WeatherPanel weather={live} variant="full" />);
    const text = container.textContent ?? "";
    expect(text).toContain("31.5°C");
    expect(text).toContain("Open-Meteo");
    expect(text).toContain("Weather data by Open-Meteo.com");
    expect(text).toMatch(/Fetched/);
    expect(screen.getByRole("table")).toBeInTheDocument();
  });
});
