# AgriSense

Farmer-first decision support. The default experience is a **Regional Crop Guide**: which crops have
historically been grown in your district and season, shown with the data behind it, plus weather from Open-Meteo.
It is **not** a crop-suitability or yield prediction.

## Architecture (polyglot, synchronous REST)

```
browser -> web (Vue 3 SPA PWA served by nginx, /api proxy) -> gateway (Spring Cloud Gateway)
              -> identity-service (Spring Boot)       schema identity
              -> farm-advisory-service (Spring Boot)  schema advisory  -> data-service, ml-service
              -> data-service (FastAPI)               schema data      -> Open-Meteo
              ml-service (FastAPI, internal only)     Model 1 (disabled for users)
PostgreSQL 16, one schema + role per service.
```

Binding conventions: `docs/architecture/conventions.md`. API contracts: `contracts/*.yaml`.
Decisions: `docs/adr/`. Data provenance and licences: `data/SOURCES.md`. ML evidence: `docs/ml/`.

## Run locally

Open **http://localhost:3000** after the stack is healthy. Dev bootstrap admin: the `ADMIN_BOOTSTRAP_*` values in `.env`.

Prerequisites: Docker, (for development) JDK 21, Maven, Node 24, Python 3.12+.

```bash
cp .env.example .env        # then change the secrets
docker compose up --build   # web on http://localhost:3000
```

Per-service tests (see each service README): `mvn verify` (Java), `pytest` (Python), `npm test` (web).

## What is deliberately not here

No irrigation module, Crop Doctor, Crop Care, yield prediction, fertilizer dosage or market prices.
Model 1 (soil-test) is shown only as an **experimental** Crop Prediction page (Insights menu). Its inputs, units and rainfall
definition are unverified (`docs/ml/rainfall-definition.md`), so every value is typed by the user, results carry a
"model score" (not a probability) and an experimental label, and it is never mixed into the Regional Crop Guide.
Set `ENABLE_MODEL1=false` to switch it off.

## Status

See `docs/testing.md` for what was actually run and what was not, and `docs/ml/` for model/data evidence.
Known limits: Hindi draft needs review; crop records end in 2014; weather via Open-Meteo free tier (attribution shown);
Model 1 disabled; no yield, fertilizer dosage or market-price features.
