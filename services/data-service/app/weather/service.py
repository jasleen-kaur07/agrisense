"""Weather with an honest status: LIVE (fetched now), CACHED (served from cache), UNAVAILABLE (nothing usable)."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Callable

from sqlalchemy.orm import Session, sessionmaker

from app.db import WeatherCache
from app.weather.provider import WeatherProvider, WeatherProviderError

log = logging.getLogger("data-service")
UNAVAILABLE_MESSAGE = "Weather is temporarily unavailable. Please try again later."


class WeatherService:
    def __init__(
        self,
        provider: WeatherProvider,
        sessions: sessionmaker[Session],
        ttl_min: int,
        max_stale_hours: int,
        now: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
    ):
        self.provider, self.sessions = provider, sessions
        self.ttl, self.max_stale = timedelta(minutes=ttl_min), timedelta(hours=max_stale_hours)
        self.now = now

    def _envelope(self, status: str, payload: dict | None, fetched_at: datetime | None, message: str | None = None) -> dict:
        body = {
            "status": status,
            "source": self.provider.name,
            "attribution": self.provider.attribution,
            "fetchedAt": fetched_at.isoformat() if fetched_at else None,
            "timezone": payload.get("timezone") if payload else None,
            "current": payload.get("current") if payload else None,
            "daily": payload.get("daily", []) if payload else [],
            "message": message,
        }
        return body

    def get(self, key: str, latitude: float, longitude: float) -> dict:
        now = self.now()
        with self.sessions() as db:
            row = db.get(WeatherCache, key)
            fetched = _aware(row.fetched_at) if row else None
            if row and now - fetched < self.ttl:
                return self._envelope("CACHED", row.payload, fetched)
            try:
                payload = self.provider.fetch(latitude, longitude)
            except WeatherProviderError as exc:
                log.warning("weather provider failed for %s: %s", key, exc)
                if row and now - fetched <= self.max_stale:
                    return self._envelope("CACHED", row.payload, fetched, "Live weather could not be refreshed; showing the last saved data.")
                return self._envelope("UNAVAILABLE", None, None, UNAVAILABLE_MESSAGE)
            if row:
                row.payload, row.fetched_at = payload, now
            else:
                db.add(WeatherCache(key=key, payload=payload, fetched_at=now))
            db.commit()
            return self._envelope("LIVE", payload, now)

    def cache_entries(self) -> int:
        with self.sessions() as db:
            return db.query(WeatherCache).count()


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
