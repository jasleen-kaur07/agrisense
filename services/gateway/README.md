# AgriSense gateway

Spring Cloud Gateway (reactive, `spring-cloud-starter-gateway-server-webflux`), Spring Boot 3.5.16,
Spring Cloud 2025.0.3, Java 21. Behaviour follows `docs/architecture/conventions.md`.

## Run

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
mvn -q verify                     # build + tests
IDENTITY_SERVICE_URL=http://localhost:8081 FARM_ADVISORY_SERVICE_URL=http://localhost:8082 \
DATA_SERVICE_URL=http://localhost:8083 IDENTITY_JWKS_URL=http://localhost:8081/.well-known/jwks.json \
ALLOWED_ORIGINS=http://localhost:3000 mvn spring-boot:run
docker build -t agrisense-gateway . && docker run --rm -p 8080:8080 --env-file .env.example agrisense-gateway
```

Compose health check: `wget -qO- http://localhost:$PORT/ready`. `/health` and `/ready` are local only
(they never call downstream services).

## Environment

See `.env.example`: `PORT`, `IDENTITY_SERVICE_URL`, `FARM_ADVISORY_SERVICE_URL`, `DATA_SERVICE_URL`,
`IDENTITY_JWKS_URL`, `ALLOWED_ORIGINS`.

## Routing (`/api/v1/**` -> `/v1/**`)

| Owner | Paths |
|---|---|
| identity | `/auth/**`, `/profile/**`, `/admin/users/**` |
| farm-advisory | `/farms/**`, `/fields/**`, `/recommendations/**`, `/plans/**`, `/alerts/**`, `/feedback`, `/admin/recommendations`, `/admin/feedback`, `/admin/stats` |
| data | `/locations/**`, `/regional/**`, `/seasons/**`, `/weather`, `/admin/data/**` |

Anything else (including `/internal/**`, `/.well-known/**`, `/actuator/**`) is a 404 problem+json.
Paths containing `..`, `//`, `;`, backslash or encoded `%2e %2f %5c %00` are rejected with 400.

## Request pipeline

1. `RequestContextFilter`: validates/creates `X-Request-ID` (client value accepted only if a UUID), strips
   client `Authorization`, `X-User-*`, `X-Internal-Token`, sets security headers
   (`nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Cache-Control: no-store` on `/api/**`), JSON access log.
2. CORS (only if `ALLOWED_ORIGINS` is set explicitly).
3. Rate limit, then 1 MB body limit.
4. After route match (`SecurityGlobalFilter`): Origin/Referer check, CSRF double submit, JWT, admin role.

Order of failures for a request: 429, 413, 404 (no route), 403 (origin), 403 (csrf), 401/503 (jwt), 403 (role).

* Public (no JWT): `POST /api/v1/auth/register|login|refresh|forgot|reset`. Only `refresh` needs CSRF of those.
* `POST /api/v1/auth/logout`: CSRF required; JWT optional (forwarded without `Authorization` if missing/expired/invalid).
* Everything else needs a valid `as_access` cookie (RS256, `iss=agrisense-identity`, `exp`), keys from `IDENTITY_JWKS_URL`.
  Keys are cached (10 min TTL), refreshed on unknown `kid` (5 s cooldown), stale keys are used if a refresh fails.
  Nothing cached and JWKS unreachable -> 503 problem. The gateway sends `Authorization: Bearer <jwt>` downstream and
  removes `as_access` from the forwarded `Cookie` header. `/api/v1/admin/**` needs `ADMIN` in `roles`.
* Unsafe methods (POST/PUT/PATCH/DELETE): `Origin` (else `Referer` origin) must be in `ALLOWED_ORIGINS`; all except
  login/register/forgot/reset also need `X-CSRF-Token` == `as_csrf` cookie (constant-time compare).
  If `ALLOWED_ORIGINS` is empty the check falls back to `http://localhost:3000`.

## Rate limiting

In-memory token bucket per client IP: 120/min general, 10/min for `/api/v1/auth/login|register|forgot|reset`
(strict endpoints have their own bucket). Client IP = first `X-Forwarded-For` hop only when the immediate peer is
loopback/private, else the socket address. **Single instance only**: buckets are per process; running several
gateway replicas needs a shared store such as Redis.

## Timeouts and errors

Connect timeout 2 s, response timeout 10 s. Timeout (read or connect) -> 504, other connect failure -> 502,
both problem+json. Downstream error bodies (including problem+json) and `Set-Cookie` headers pass through unchanged.
Logs are JSON lines (`ts, level, service, traceId, msg`); cookies, tokens and query strings are never logged.
