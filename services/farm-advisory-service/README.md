# farm-advisory-service

Spring Boot 3.5 / Java 21. Farms, fields, optional soil, Regional Crop Guide recommendations (historical prevalence, never suitability), history, compare, sourced action plans, weather WATCH alerts, feedback and admin views. Contract: `contracts/farm-advisory.yaml`; it calls data-service (`contracts/data.yaml`) with `X-Internal-Token` and `X-Request-ID`.

## Run
```
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
cp .env.example .env   # then export the variables
mvn spring-boot:run
```
Needs Postgres with schema `advisory` (Flyway creates it and the tables; datasource URL must carry `currentSchema=advisory`).
Docker: `docker build -t farm-advisory-service . && docker run -p 8082:8082 --env-file .env farm-advisory-service`.

## Test
`mvn -q verify` (unit tests via Surefire, integration tests `*IT` via Failsafe; needs Docker for Testcontainers postgres:16-alpine; WireMock stands in for data-service and the identity JWKS).

## Notes
- Auth: RS256 JWT validated against `IDENTITY_JWKS_URL`, issuer `agrisense-identity`, `roles` claim -> `ROLE_*`. Owner = `sub`; other users' resources return 404. `/v1/admin/**` needs ADMIN.
- data-service calls: connect 2 s, read 4 s, GET only, no retries, Resilience4j circuit breaker (4xx answers do not trip it). Unreachable -> 503, upstream error -> 502.
- Weather failure never fails a recommendation; an UNAVAILABLE weather object is stored.
- Alert job: `@Scheduled`, `ALERTS_INTERVAL_MS`, at most `ALERTS_MAX_FARMS` farms per run, one weather call per district per run. HEAVY_RAIN >= 64.5 mm/day, HIGH_TEMPERATURE >= 40 C within the 7-day forecast; skipped when weather is UNAVAILABLE. Dedupe key `TYPE:farm:<farmId>:<ISO week of first matching day>`.
- Plans are computed on demand from the stored recommendation (no table), so they are reproducible.
