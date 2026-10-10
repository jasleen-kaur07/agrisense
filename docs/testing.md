# Testing record (2026-10-10, local machine)

Everything below was actually run; counts are from the reports/outputs of those runs.
GitHub Actions (`.github/workflows/ci.yml`) has **not** been executed (no remote); its steps were run locally instead.

| Suite | Command | Result |
|---|---|---|
| data-service | `services/data-service/.venv/bin/python -m pytest -q` | 32 passed |
| ml-service | `services/ml-service/.venv/bin/python -m pytest -q` | 9 passed |
| identity-service | `mvn verify` (Testcontainers Postgres 16) | 32 tests, 0 failures |
| farm-advisory-service | `mvn verify` | 40 tests, 0 failures |
| gateway | `mvn verify` | 30 tests, 0 failures |
| web unit | `npm test` | 38 passed (7 files) |
| web lint / typecheck / build | `npm run lint`, `typecheck`, `build` | clean (build: 27 routes) |
| web E2E vs DEMO mock API | `npm run e2e` | 10 passed |
| **Real-stack API** (gateway, no mocks) | `services/data-service/.venv/bin/python -m pytest tests/e2e/api -q` | 16 passed |
| **Real-stack browser** (web -> gateway -> services) | `cd apps/web && npx playwright test -c playwright.real.config.ts` | 8 passed, 2 skipped (manual-only specs) |
| Weather UNAVAILABLE in the browser | `EXPECT_WEATHER=unavailable npx playwright test -c playwright.real.config.ts weather-unavailable` after starting data-service with `OPEN_METEO_BASE_URL=http://127.0.0.1:9` and an empty cache | 1 passed |
| Regional back-test (G6) | `services/data-service/.venv/bin/python ml/evaluation/regional_backtest.py` | PASS (`docs/ml/regional_backtest.md`) |
| Model 1 validation (G1-G5) | `ml/.venv/bin/python ml/model1/validate_model1.py` | scaler defect documented (`docs/ml/model1_validation.md`) |
| Images | `docker compose build` | all 7 images built |
| `npm audit --omit=dev` | | 0 vulnerabilities |

Real-stack coverage: cookies (HttpOnly/SameSite/path), CSRF and Origin enforcement, generic login failure, refresh
rotation and reuse detection, logout, forgot/reset, profile/onboarding without soil, GPS nearest district, farm/field
CRUD and validation, optional partial soil, Regional Crop Guide (kind, coverage, fallback flag, no suitability wording),
idempotency, compare/plan content rules, history, ownership isolation (404 for other users), admin 403/200,
weather LIVE -> CACHED -> UNAVAILABLE (provider broken, empty cache), PWA manifest/icons/service worker/offline fallback,
`/api` never cached, mobile/tablet/desktop overflow and axe (WCAG 2 A/AA) checks.

## Not tested / limits

- Installing the PWA through a browser prompt (headless cannot); manifest, icons, service worker and offline fallback are checked.
- Stale-cache CACHED fallback (provider failing while an older snapshot exists) is covered by unit tests only.
- Real iOS/Android devices; only Chromium device emulation (Pixel 7, iPad) was run.
- Circuit-breaker opening in farm-advisory is not tested (tests set a very high threshold).
- No load/performance testing. Rate limiters are in-memory and single-instance.
- Hindi strings are a draft and need native-speaker review.
