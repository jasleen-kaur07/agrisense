from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from sqlalchemy import text

from app import errors
from app.config import Settings, get_settings
from app.db import Base, make_session_factory
from app.domain.locations import Gazetteer
from app.domain.regional import RegionalEngine
from app.logging_setup import configure_logging, request_id_var, valid_request_id
from app.routers.api import router
from app.security import JwtVerifier
from app.weather.provider import OpenMeteoProvider
from app.weather.service import WeatherService

log = logging.getLogger("data-service")


def create_app(settings: Settings | None = None, verifier: JwtVerifier | None = None, provider=None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        engine, sessions = make_session_factory(settings.database_url)
        if settings.database_url.startswith("sqlite"):
            Base.metadata.create_all(engine)  # tests / local dev only; Postgres uses Alembic
        app.state.db_engine = engine
        app.state.gazetteer = Gazetteer.from_csv(settings.data_dir / "gazetteer.csv")
        app.state.engine = RegionalEngine.from_csv(settings.data_dir / "regional_stats.csv.gz")
        app.state.weather = WeatherService(
            provider or OpenMeteoProvider(settings.open_meteo_base_url, settings.weather_timeout_s),
            sessions,
            settings.weather_cache_ttl_current_min,
            settings.weather_max_stale_hours,
        )
        app.state.verifier = verifier or JwtVerifier(settings)
        log.info("data-service ready: %d supported districts", len(app.state.gazetteer.frame))
        yield
        engine.dispose()

    app = FastAPI(title="AgriSense data-service", version="1.0.0", lifespan=lifespan)
    app.dependency_overrides[get_settings] = lambda: settings
    errors.install(app)

    @app.middleware("http")
    async def request_id(request: Request, call_next):
        rid = valid_request_id(request.headers.get("x-request-id"))
        request_id_var.set(rid)
        response = await call_next(request)
        response.headers["X-Request-ID"] = rid
        return response

    @app.get("/health")
    def health():
        return {"status": "UP"}

    @app.get("/ready")
    def ready(request: Request):
        try:
            with request.app.state.db_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            ok = len(request.app.state.gazetteer.frame) > 0 and request.app.state.engine.row_count > 0
        except Exception:  # noqa: BLE001
            ok = False
        if not ok:
            from fastapi.responses import JSONResponse

            return JSONResponse({"status": "DOWN"}, status_code=503)
        return {"status": "UP"}

    app.include_router(router)
    return app


app = create_app()
