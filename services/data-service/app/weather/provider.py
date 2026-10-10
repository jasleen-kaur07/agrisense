"""Weather provider abstraction. Open-Meteo is the only implementation; others can be added behind the same interface."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

import httpx


class WeatherProviderError(Exception):
    pass


class WeatherProvider(ABC):
    name: str
    attribution: str

    @abstractmethod
    def fetch(self, latitude: float, longitude: float) -> dict[str, Any]:
        """Return normalised {timezone, current{...}, daily[...]} or raise WeatherProviderError."""


class OpenMeteoProvider(WeatherProvider):
    name = "Open-Meteo"
    attribution = "Weather data by Open-Meteo.com (CC BY 4.0)"

    def __init__(self, base_url: str, timeout_s: float = 3.0, client: httpx.Client | None = None):
        self._url = base_url.rstrip("/") + "/v1/forecast"
        self._client = client or httpx.Client(timeout=httpx.Timeout(timeout_s, connect=1.5))

    def fetch(self, latitude: float, longitude: float) -> dict[str, Any]:
        params = {
            "latitude": round(latitude, 4),
            "longitude": round(longitude, 4),
            "current": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code",
            "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max",
            "forecast_days": 7,
            "timezone": "auto",
            "wind_speed_unit": "kmh",
        }
        try:
            resp = self._client.get(self._url, params=params)
            resp.raise_for_status()
            return self._normalise(resp.json())
        except (httpx.HTTPError, ValueError, KeyError, TypeError) as exc:
            raise WeatherProviderError(type(exc).__name__) from exc

    @staticmethod
    def _normalise(raw: dict[str, Any]) -> dict[str, Any]:
        cur, daily = raw["current"], raw["daily"]
        days = []
        for i, date in enumerate(daily["time"]):
            days.append(
                {
                    "date": date,
                    "tempMaxC": daily["temperature_2m_max"][i],
                    "tempMinC": daily["temperature_2m_min"][i],
                    "precipitationSumMm": daily["precipitation_sum"][i],
                    "precipitationProbabilityMaxPct": (daily.get("precipitation_probability_max") or [None] * len(daily["time"]))[i],
                    "weatherCode": daily["weather_code"][i],
                }
            )
        return {
            "timezone": raw.get("timezone"),
            "current": {
                "time": cur["time"],
                "temperatureC": cur["temperature_2m"],
                "humidityPct": cur["relative_humidity_2m"],
                "precipitationMm": cur["precipitation"],
                "windKmh": cur["wind_speed_10m"],
                "weatherCode": cur["weather_code"],
            },
            "daily": days,
        }
