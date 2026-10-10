import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.logging_setup import request_id_var

log = logging.getLogger("data-service")
PROBLEM = "application/problem+json"


def problem(status: int, title: str, detail: str | None, request: Request, kind: str, errors: list | None = None):
    body = {
        "type": f"https://agrisense.local/problems/{kind}",
        "title": title,
        "status": status,
        "detail": detail,
        "instance": request.url.path,
        "traceId": request_id_var.get(),
    }
    if errors:
        body["errors"] = errors
    return JSONResponse(body, status_code=status, media_type=PROBLEM)


class ApiError(Exception):
    def __init__(self, status: int, title: str, detail: str | None = None, kind: str = "error"):
        self.status, self.title, self.detail, self.kind = status, title, detail, kind


def install(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def _api(request: Request, exc: ApiError):
        return problem(exc.status, exc.title, exc.detail, request, exc.kind)

    @app.exception_handler(StarletteHTTPException)
    async def _http(request: Request, exc: StarletteHTTPException):
        return problem(exc.status_code, str(exc.detail) if exc.status_code != 404 else "Not found", None, request, "http")

    @app.exception_handler(RequestValidationError)
    async def _validation(request: Request, exc: RequestValidationError):
        errors = [
            {"field": ".".join(str(p) for p in e["loc"][1:]) or str(e["loc"][0]), "message": e["msg"]}
            for e in exc.errors()
        ]
        return problem(422, "Validation failed", "One or more parameters are invalid.", request, "validation", errors)

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception):
        log.exception("unhandled error")
        return problem(500, "Internal error", None, request, "internal")
