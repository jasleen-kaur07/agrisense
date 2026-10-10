import httpx
import pytest
import respx

from app.weather.provider import OpenMeteoProvider, WeatherProviderError

RAW = {
    "timezone": "Asia/Kolkata",
    "current": {"time": "2026-10-10T10:00", "temperature_2m": 30.1, "relative_humidity_2m": 61, "precipitation": 0.0, "wind_speed_10m": 7.5, "weather_code": 3},
    "daily": {
        "time": ["2026-10-10", "2026-10-11"],
        "weather_code": [3, 61],
        "temperature_2m_max": [33.0, 31.0],
        "temperature_2m_min": [22.0, 21.0],
        "precipitation_sum": [0.0, 12.5],
        "precipitation_probability_max": [10, 80],
    },
}


@respx.mock
def test_normalises_open_meteo_response_and_sends_expected_params():
    route = respx.get("https://api.open-meteo.com/v1/forecast").mock(return_value=httpx.Response(200, json=RAW))
    out = OpenMeteoProvider("https://api.open-meteo.com").fetch(26.85, 80.95)
    q = route.calls[0].request.url.params
    assert q["forecast_days"] == "7" and q["timezone"] == "auto" and "precipitation_sum" in q["daily"]
    assert out["current"]["temperatureC"] == 30.1 and out["daily"][1]["precipitationSumMm"] == 12.5
    assert out["daily"][1]["precipitationProbabilityMaxPct"] == 80


@respx.mock
@pytest.mark.parametrize("response", [httpx.Response(500), httpx.Response(200, json={"oops": 1}), httpx.Response(200, text="not json")])
def test_provider_errors_are_wrapped(response):
    respx.get("https://api.open-meteo.com/v1/forecast").mock(return_value=response)
    with pytest.raises(WeatherProviderError):
        OpenMeteoProvider("https://api.open-meteo.com").fetch(1, 1)


@respx.mock
def test_timeout_is_wrapped():
    respx.get("https://api.open-meteo.com/v1/forecast").mock(side_effect=httpx.ConnectTimeout("t"))
    with pytest.raises(WeatherProviderError):
        OpenMeteoProvider("https://api.open-meteo.com").fetch(1, 1)
