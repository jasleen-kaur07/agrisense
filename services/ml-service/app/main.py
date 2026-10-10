from __future__ import annotations

import hmac
import json
import logging
import os
import sys
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.model1 import FEATURES, Model1, ModelLoadError, ValidationFailure

log = logging.getLogger("ml-service")
ARTIFACTS = Path(os.getenv("ARTIFACT_DIR", Path(__file__).resolve().parent.parent / "artifacts" / "model1" / "1.0.0"))
PROBLEM = "application/problem+json"
_request_id = "-"


class JsonFormatter(logging.Formatter):
    def format(self, record):
        return json.dumps({"ts": datetime.now(timezone.utc).isoformat(timespec="milliseconds"), "level": record.levelname,
                           "service": "ml-service", "traceId": _request_id, "msg": record.getMessage()})


def problem(request: Request, status: int, title: str, kind: str, detail: str | None = None, errors=None):
    body = {"type": f"https://agrisense.local/problems/{kind}", "title": title, "status": status, "detail": detail,
            "instance": request.url.path, "traceId": _request_id}
    if errors:
        body["errors"] = errors
    return JSONResponse(body, status_code=status, media_type=PROBLEM)


class Model1Input(BaseModel):
    N: float | None = None
    P: float | None = None
    K: float | None = None
    temperature: float | None = None
    humidity: float | None = None
    ph: float | None = None
    rainfall: float | None = None


def create_app(enable_model1: bool | None = None, internal_token: str | None = None) -> FastAPI:
    enabled = (os.getenv("ENABLE_MODEL1", "false").lower() == "true") if enable_model1 is None else enable_model1
    token = internal_token if internal_token is not None else os.getenv("INTERNAL_API_TOKEN", "")
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    logging.getLogger().handlers = [handler]
    logging.getLogger().setLevel(logging.INFO)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.model, app.state.load_error = None, None
        if enabled:
            try:
                app.state.model = Model1(ARTIFACTS)
                log.info("Model 1 loaded (version %s)", app.state.model.version)
            except (ModelLoadError, OSError, KeyError) as exc:
                app.state.load_error = str(exc)
                log.error("Model 1 failed to load: %s", exc)
        else:
            log.info("Model 1 disabled (ENABLE_MODEL1=false)")
        yield

    app = FastAPI(title="AgriSense ml-service", version="1.0.0", lifespan=lifespan)

    @app.middleware("http")
    async def request_id(request: Request, call_next):
        global _request_id
        raw = request.headers.get("x-request-id", "")
        try:
            _request_id = str(uuid.UUID(raw))
        except ValueError:
            _request_id = str(uuid.uuid4())
        response = await call_next(request)
        response.headers["X-Request-ID"] = _request_id
        return response

    @app.exception_handler(StarletteHTTPException)
    async def _http(request, exc):
        return problem(request, exc.status_code, "Not found" if exc.status_code == 404 else str(exc.detail), "http")

    @app.exception_handler(RequestValidationError)
    async def _validation(request, exc):
        errs = [{"field": ".".join(str(p) for p in e["loc"][1:]), "message": e["msg"]} for e in exc.errors()]
        return problem(request, 422, "Validation failed", "validation", errors=errs)

    @app.exception_handler(ValidationFailure)
    async def _model_validation(request, exc: ValidationFailure):
        return problem(request, 422, "Validation failed", "validation", "Input rejected; nothing was imputed.", exc.errors)

    @app.exception_handler(Exception)
    async def _unhandled(request, exc):
        log.exception("unhandled error")
        return problem(request, 500, "Internal error", "internal")

    @app.get("/health")
    def health():
        return {"status": "UP"}

    @app.get("/ready")
    def ready(request: Request):
        if enabled and request.app.state.model is None:
            return JSONResponse({"status": "DOWN", "reason": "model failed to load"}, status_code=503)
        return {"status": "UP", "model1": "ENABLED" if enabled else "DISABLED"}

    def guard(request: Request):
        given = request.headers.get("x-internal-token", "")
        if not token or not hmac.compare_digest(given.encode(), token.encode()):
            raise StarletteHTTPException(401, "Unauthorized")

    @app.get("/internal/v1/models", dependencies=[Depends(guard)])
    def models(request: Request):
        m = request.app.state.model
        if m:
            return [{**m.info(), "enabled": True}]
        return [{"name": "model1-rf", "version": "1.0.0", "enabled": False,
                 "status": "DISABLED_FOR_USERS", "loadError": request.app.state.load_error,
                 "reason": "Inputs and rainfall definition are not validated; see docs/ml/rainfall-definition.md"}]

    @app.post("/internal/v1/model1/predict", dependencies=[Depends(guard)])
    def predict(body: Model1Input, request: Request):
        m = request.app.state.model
        if not enabled:
            return problem(request, 403, "Model disabled", "model-disabled", "Model 1 is disabled (ENABLE_MODEL1=false).")
        if m is None:
            return problem(request, 503, "Model unavailable", "model-unavailable", "Model 1 failed to load.")
        return m.predict(body.model_dump())

    return app


app = create_app()
