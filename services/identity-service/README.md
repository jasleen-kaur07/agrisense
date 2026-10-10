# identity-service

Accounts, sessions, farmer profile and user administration. Spring Boot 3.5, Java 21, port `8081` (`PORT`).
API: `contracts/identity.yaml`; cookie/CSRF/JWT rules: `docs/architecture/conventions.md`.

## Run

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
DATABASE_URL='jdbc:postgresql://localhost:5433/agrisense?currentSchema=identity' DB_USER=identity DB_PASSWORD=... \
COOKIE_SECURE=false MAIL_MODE=log mvn spring-boot:run
# or: docker build -t agrisense/identity-service . 
```
Flyway creates/migrates the `identity` schema on startup.

## Test

`mvn -q verify` (unit tests plus integration tests on Testcontainers `postgres:16-alpine`; Docker must be running).

## Environment

See `.env.example`. Notes:

* `JWT_PRIVATE_KEY_PEM` empty: an ephemeral RSA-2048 key is generated (warning logged); sessions die on restart.
* `MAIL_MODE=log` is dev only: the full reset link `http://localhost:3000/reset-password?token=...` is logged at INFO.
  No other mode logs a link; there is no SMTP transport yet.
* Rate limiting is in-memory and single-instance (per IP and per email on login; per IP on register; per IP and email on forgot).
  Client IP = last `X-Forwarded-For` hop, else the socket address.
* Access tokens are checked against the user's `token_version` (`ver`) and `enabled` flag on every authenticated request.
