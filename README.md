# AgriSense

Farmer-first decision support. The default experience is a **Regional Crop Guide**: which crops have
historically been grown in your district and season, shown with the data behind it, plus weather from Open-Meteo.
It is **not** a crop-suitability or yield prediction.

## Architecture (polyglot, synchronous REST)

```
browser -> web (Next.js PWA, /api proxy) -> gateway (Spring Cloud Gateway)
              -> identity-service (Spring Boot)       schema identity
              -> farm-advisory-service (Spring Boot)  schema advisory  -> data-service, ml-service
              -> data-service (FastAPI)               schema data      -> Open-Meteo
              ml-service (FastAPI, internal only)     Model 1 (disabled for users)
PostgreSQL 16, one schema + role per service.
```

Binding conventions: `docs/architecture/conventions.md`. API contracts: `contracts/*.yaml`.
Decisions: `docs/adr/`. Data provenance and licences: `data/SOURCES.md`. ML evidence: `docs/ml/`.

## Run locally

Prerequisites: Docker, (for development) JDK 21, Maven, Node 24, Python 3.12+.

```bash
cp .env.example .env        # then change the secrets
docker compose up --build   # web on http://localhost:3000
```

Per-service tests (see each service README): `mvn verify` (Java), `pytest` (Python), `npm test` (web).

## What is deliberately not here

No irrigation module, Crop Doctor, Crop Care, yield prediction, fertilizer dosage or market prices.
Model 1 (soil-test) exists for validation only and is disabled for users (`ENABLE_MODEL1=false`) until its
inputs, units and rainfall definition are verified (`docs/ml/rainfall-definition.md`).
