"""Authentication for data-service: a valid user JWT (RS256 via identity JWKS) or the internal token."""

from __future__ import annotations

import hmac
from dataclasses import dataclass, field
from typing import Callable

import jwt
from fastapi import Depends, Request

from app.config import Settings, get_settings
from app.errors import ApiError


@dataclass
class Principal:
    kind: str  # "user" | "internal"
    subject: str | None = None
    roles: list[str] = field(default_factory=list)


class JwtVerifier:
    """Verifies identity-issued JWTs. `key_resolver(token) -> public key` is injectable for tests."""

    def __init__(self, settings: Settings, key_resolver: Callable[[str], object] | None = None):
        self.issuer = settings.jwt_issuer
        if key_resolver is None:
            client = jwt.PyJWKClient(settings.identity_jwks_url, cache_keys=True, lifespan=300, timeout=3)
            key_resolver = lambda token: client.get_signing_key_from_jwt(token).key  # noqa: E731
        self._resolve = key_resolver

    def verify(self, token: str) -> dict:
        try:
            key = self._resolve(token)
            return jwt.decode(token, key, algorithms=["RS256"], issuer=self.issuer, options={"require": ["exp", "sub", "iss"]})
        except jwt.PyJWKClientConnectionError as exc:
            raise ApiError(503, "Authentication unavailable", "Cannot reach the identity service.", "auth-unavailable") from exc
        except jwt.PyJWTError as exc:
            raise ApiError(401, "Unauthorized", None, "unauthorized") from exc


def _bearer(request: Request) -> str | None:
    header = request.headers.get("authorization", "")
    return header[7:] if header.lower().startswith("bearer ") else None


def get_verifier(request: Request) -> JwtVerifier:
    return request.app.state.verifier


def current_principal(
    request: Request, settings: Settings = Depends(get_settings), verifier: JwtVerifier = Depends(get_verifier)
) -> Principal:
    internal = request.headers.get("x-internal-token")
    if internal is not None:
        if settings.internal_api_token and hmac.compare_digest(internal.encode(), settings.internal_api_token.encode()):
            return Principal(kind="internal")
        raise ApiError(401, "Unauthorized", None, "unauthorized")
    token = _bearer(request)
    if not token:
        raise ApiError(401, "Unauthorized", None, "unauthorized")
    claims = verifier.verify(token)
    return Principal(kind="user", subject=claims["sub"], roles=list(claims.get("roles", [])))


def require_admin(principal: Principal = Depends(current_principal)) -> Principal:
    if principal.kind != "user" or "ADMIN" not in principal.roles:
        raise ApiError(403, "Forbidden", "Administrator role required.", "forbidden")
    return principal
