# ADR 0004: Weather status semantics

LIVE = fetched from Open-Meteo during this request. CACHED = served from the cache (within the TTL, or as a stale
fallback up to 24 h when the provider fails; the stale case carries an explanatory message). UNAVAILABLE = nothing
usable; no numbers are returned. One TTL (`WEATHER_CACHE_TTL_CURRENT_MIN`, default 30) covers the whole snapshot;
`WEATHER_CACHE_TTL_FORECAST_MIN` is not used. Open-Meteo requires attribution (shown on every weather panel).
