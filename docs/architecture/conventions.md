# AgriSense platform conventions (binding for every service)

Status: v1, 2026-10-10. Changing anything here requires updating `contracts/*.yaml` and every consumer.

## Topology

| Component | Tech | Port | Public? | DB schema |
|---|---|---|---|---|
| web | Vue 3 + TypeScript SPA behind nginx | 3000 | yes (browser) | - |
| gateway | Spring Cloud Gateway (Java 21) | 8080 | via web `/api/*` rewrite | - |
| identity-service | Spring Boot 3.5 (Java 21) | 8081 | no | `identity` |
| farm-advisory-service | Spring Boot 3.5 (Java 21) | 8082 | no | `advisory` |
| data-service | FastAPI (Python 3.12+) | 8083 | no | `data` |
| ml-service | FastAPI (Python 3.12+) | 8084 | no (internal only) | `ml` |
| postgres | PostgreSQL 16 | 5432 (host 5433) | no | all four schemas |

Synchronous REST only. No message broker. Browser traffic goes
`browser -> web (nginx, /api/* proxy) -> gateway -> service`.

## Public API paths (all via gateway, prefix `/api/v1`)

| Path prefix | Service | Auth |
|---|---|---|
| `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/forgot`, `/auth/reset` | identity | public |
| `/auth/logout`, `/auth/me`, `/profile`, `/admin/users/**` | identity | cookie JWT (admin for `/admin/**`) |
| `/farms`, `/fields`, `/recommendations`, `/plans`, `/alerts`, `/feedback`, `/admin/recommendations`, `/admin/feedback`, `/admin/stats` | farm-advisory | cookie JWT |
| `/predictions/crop` | farm-advisory (calls ml-service) | cookie JWT |
| `/locations/**`, `/regional/**`, `/seasons/**`, `/weather` | data | cookie JWT |

The gateway strips `/api` and forwards `/v1/...` to the owning service
(so identity serves `/v1/auth/login`, farm-advisory serves `/v1/farms`, ...).

## Authentication

* Identity issues an RS256 **access JWT** (15 min) and an opaque **refresh token** (idle 7 d, absolute 30 d).
* Cookies (all `HttpOnly` except CSRF, `SameSite=Strict`, `Secure` controlled by `COOKIE_SECURE`, default true in prod, false in local Compose):
  * `as_access`  - access JWT, path `/`
  * `as_refresh` - refresh token, path `/api/v1/auth`
  * `as_csrf`    - random 256-bit value, **readable by JS**, path `/`
* **CSRF**: every unsafe method (POST/PUT/PATCH/DELETE) except `/auth/login`, `/auth/register`, `/auth/forgot`, `/auth/reset` must carry header `X-CSRF-Token` equal to the `as_csrf` cookie (double submit), and an `Origin`/`Referer` matching `ALLOWED_ORIGINS`. The gateway enforces both. `/auth/refresh` and `/auth/logout` require CSRF too.
* **JWT claims**: `iss=agrisense-identity`, `sub=<user uuid>`, `roles=["FARMER"]|["ADMIN"]|both`, `jti`, `iat`, `exp`, `ver` (user token version).
* JWKS: identity serves `GET /.well-known/jwks.json` (internal URL `IDENTITY_JWKS_URL`). Gateway and every service validate signatures with it. Downstream services receive `Authorization: Bearer <jwt>` (gateway converts the cookie) and must re-validate.
* **Refresh rotation**: each refresh issues a new refresh token and invalidates the previous one. Tokens stored as SHA-256 hashes with a `family_id`. Presenting an already-used token revokes the whole family. Logout revokes the family. Password reset/change revokes all families of that user.
* Passwords: Argon2id, min length 10. Login and reset endpoints are rate limited. Login errors are generic. Forgot-password always returns 202.
* **Internal calls** (farm-advisory -> data-service / ml-service): header `X-Internal-Token: <INTERNAL_API_TOKEN>` (constant-time compare). `ml-service` accepts only this; `data-service` accepts either a valid user JWT or the internal token. These services are not published outside the Docker network.
* Gateway sets `X-Client-IP` (its own view of the caller: first `X-Forwarded-For` hop when the peer is a private address, else the socket address) and strips any client-supplied value. Identity uses it for per-IP rate limiting. The web tier (nginx) is the trusted proxy: it sets `X-Forwarded-For` from `$remote_addr`, or passes a client-supplied value through only when `TRUST_CLIENT_FORWARDED_FOR=true` (local/test use; production must have a trusted proxy in front).
* Gateway removes any incoming `X-Request-ID`/`X-User-*`/`X-Internal-Token` headers from clients.

## Correlation, logging, health

* `X-Request-ID` (UUID) created by the gateway if absent, forwarded on every hop, returned to the client, included in every log line and every error body as `traceId`.
* Logs: JSON, one object per line, fields `ts, level, service, traceId, msg`. Never log passwords, tokens, cookies or full emails.
* Every service: `GET /health` (liveness, no dependencies) and `GET /ready` (dependencies reachable; DB, and for ml-service model loaded). Spring services use `/actuator/health/liveness` and `/actuator/health/readiness`; **also** expose them at `/health` and `/ready` via redirect or equivalent so Compose checks are uniform.

## Errors (RFC 7807 `application/problem+json`)

```json
{ "type": "https://agrisense.local/problems/validation", "title": "Validation failed",
  "status": 422, "detail": "…", "instance": "/v1/farms", "traceId": "…",
  "errors": [ { "field": "areaAcres", "message": "must be greater than 0" } ] }
```
Statuses used: 400, 401, 403, 404, 409, 422, 429, 502, 503. Never leak stack traces or SQL.

## Data-status vocabulary (any external or derived data shown to users)

`LIVE` | `CACHED` | `USER` | `UNAVAILABLE` | `DEMO`. Weather carries `status`, `source`, `fetchedAt`.
Regional results carry `basis`, `yearsCovered`, `stateFallbackUsed`.

## Naming and formats

* JSON camelCase; enums UPPER_SNAKE; ids are UUID strings; timestamps ISO-8601 UTC.
* Seasons: `KHARIF`, `RABI`, `SUMMER` (data-service maps them to source labels `Kharif`, `Rabi`, `Summer`).
* Languages: `en`, `hi`.
* Pagination: `page` (0-based), `size` (<=100); response `{ items, page, size, totalItems, totalPages }`.
* Idempotency: `POST /v1/recommendations` accepts `Idempotency-Key` (UUID); same key + same user returns the original response.

## Environment variables (names are binding; see each service's `.env.example`)

`DATABASE_URL`/`SPRING_DATASOURCE_*` (per-service role), `INTERNAL_API_TOKEN`, `IDENTITY_JWKS_URL`,
`JWT_PRIVATE_KEY_PEM` (identity; dev generates an ephemeral key if empty), `COOKIE_SECURE`,
`ALLOWED_ORIGINS`, `DATA_SERVICE_URL`, `ML_SERVICE_URL`, `ENABLE_MODEL1` (`true` in `.env.example`; `false` disables the prediction page),
`OPEN_METEO_BASE_URL`, `OPEN_METEO_GEOCODING_URL`, `WEATHER_CACHE_TTL_CURRENT_MIN` (30; one TTL for the whole snapshot, see ADR 0004),
`MAIL_MODE` (`log` in dev), `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD` (dev only).

## Product rules that code must enforce

* Default Crop Advice = **Regional Crop Guide** (historical prevalence). Never label it suitability, "best crop" or a probability.
* Soil values are optional everywhere. No imputation. No weather/rainfall fed to any model.
* Model 1 (soil-test) is an **experimental, user-visible** feature (`ENABLE_MODEL1=true`; with `false` the ml-service returns 403 `model-disabled` and farm-advisory answers 503). It is reached only through `POST /v1/predictions/crop`, takes all seven values from the user (no imputed values, no API-derived rainfall), and every result is labelled experimental with a model score that is never called a probability. It is never merged into the Regional Crop Guide.
* No irrigation module, Crop Doctor, Crop Care, yield prediction, fertilizer dosage or market prices.
* No business or agricultural logic in the frontend.
