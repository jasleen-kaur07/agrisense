# AgriSense web

Vue 3 (script setup) + TypeScript (strict) + Vite + Vue Router 4 (history mode) + Pinia + Tailwind CSS v4 + vue-i18n +
Zod, served in production by nginx (static files + `/api/*` reverse proxy). It talks only to the public API contracts
(`contracts/*.yaml`) under `/api/v1`.

`apps/web-next-legacy` is the **retired Next.js reference implementation** (read-only, not built, not tested in CI).
This app ports its behaviour, wording and look 1:1.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on :3000, `/api` proxied to `GATEWAY_URL` (default `http://localhost:8080`) |
| `npm run build` / `npm run preview` | `vue-tsc` + production build into `dist/`; preview serves it (also proxies `/api`) |
| `npm run lint` / `npm run typecheck` | ESLint (typescript-eslint + eslint-plugin-vue) / `vue-tsc` (app and node configs) |
| `npm test` | Vitest + Vue Test Utils unit tests |
| `npm run test:e2e` | browser suite against the running stack at `http://localhost:3000` (`WEB_URL` to override) |
| `npm run test:nginx` | builds the image and tests the nginx config against a fake gateway (both X-Forwarded-For modes) |
| `npm run icons` | regenerate PNG icons (needs `sharp`) |

First time: `npx playwright install chromium`.

## Running

Against the real gateway: `npm run dev` (gateway on `http://localhost:8080`), or from the repo root
`docker compose up -d --build --no-deps web` (use `--no-deps` to leave the other services untouched) and open http://localhost:3000.

## nginx proxy (production image)

`Dockerfile`: node:24-alpine build, then `nginxinc/nginx-unprivileged` serving `dist/` on port **3000**.
`nginx/default.conf.template` is rendered at container start (envsubst):

| Env | Default | Meaning |
|---|---|---|
| `GATEWAY_URL` | `http://gateway:8080` | where `/api/*` is proxied (no path; DNS is re-resolved, so gateway restarts are fine) |
| `TRUST_CLIENT_FORWARDED_FOR` | `false` | see below |

`/api/`: forwards Cookie, Origin, X-CSRF-Token, Idempotency-Key, X-Request-ID; passes every Set-Cookie; strips client
`X-Internal-Token`, `X-Client-IP`, `X-User-*`; sets X-Forwarded-Proto/Host; `Cache-Control: no-store`; 1 MB body limit;
a failed upstream becomes a 503 `application/problem+json`. SPA fallback via `try_files`; `/sw.js`, `/index.html`,
`/manifest.webmanifest`, `/offline.html` are `no-cache`; `/assets/*` is immutable. Security headers: nosniff, Referrer-Policy,
X-Frame-Options DENY, Permissions-Policy (geolocation allowed for the origin), and a strict CSP (no inline script/style, no eval).

**X-Forwarded-For modes.** The gateway keys its per-IP rate limits on X-Forwarded-For, so nginx is the trusted proxy:

- `TRUST_CLIENT_FORWARDED_FOR=false` (image default, production): the header is **overwritten** with `$remote_addr`.
- `TRUST_CLIENT_FORWARDED_FOR=true` (set in `docker-compose.yml` for local/test only): the client's header is passed through,
  so a test machine can simulate many visitors (the real-stack specs set a per-visitor header). Production must keep `false`
  and put a trusted proxy in front.

Switch modes by restarting the container with the other value. `npm run test:nginx` demonstrates both with curl.

## Structure

```
src/main.ts, App.vue        bootstrap, app-level error boundary
src/router/                 routes (same URLs as the Next app), global auth guard, document titles
src/stores/                 Pinia: session (GET /auth/me, once per page load), locale (EN/HI)
src/lib/api/                client (CSRF, one silent refresh + retry, problem+json), typed endpoints, types, errors
src/lib/query.ts, form.ts   small server-state helper (cache, invalidate, mutations) and Zod form helper
src/composables/            shared queries (profile, farms, fields, season, home location)
src/i18n/                   vue-i18n setup, messages/en.json + hi.json (hi needs native-speaker review)
src/components/             ui primitives, layout shells, data states, weather, advice, location
src/features/               auth, onboarding, farms, advice, overview, insights, marketing, more, settings, admin
src/views/                  thin route views (auth, landing, 404, error)
src/assets/main.css         Tailwind v4 + design tokens
public/                     sw.js, offline.html, manifest.webmanifest, icons
tests/                      unit (Vitest), e2e-real (browser suite against the running stack)
nginx/, Dockerfile          production serving and proxy
```
No agricultural logic lives in components: they render what the API returns.

## Auth model

Tokens are HttpOnly cookies, so the SPA cannot read them. The router guard awaits the session store, which calls
`GET /auth/me` once per page load (the API client does one shared `POST /auth/refresh` and retries on 401). Signed-out
users go to `/login?next=...`, signed-in users skip `/login` and `/register`, unfinished onboarding redirects to `/onboarding`,
`/admin` needs the ADMIN role (UX only; the backend enforces it). CSRF: the readable `as_csrf` cookie is sent as
`X-CSRF-Token` on POST/PUT/PATCH/DELETE except login/register/forgot/reset. Visitors without an `as_csrf` cookie cannot
have a session, so `/login` and `/register` make no request for them.

## PWA

`public/sw.js` (registered in production only) precaches `/offline.html`, icons and the manifest, runtime-caches `/assets/*`
and `/icons/*`, serves `/offline.html` when a navigation fails, and never touches `/api/*` or stores HTML. This is not
full offline support. Page titles and `<html lang>` follow the selected language.

## Design tokens

From `design-refs/AgriSense_V14...html`, in `src/assets/main.css`: paper `#f4f0e7`, surface `#fffdf8`, ink `#252b28`,
forest `#19342d`, olive `#6f7f50`, terracotta `#b96e51`, ochre `#b99a59`, dusty blue `#708c94`, line `#dcd8cd`; darker `-ink`
variants for text (WCAG AA). Fonts are self-hosted via `@fontsource-variable/inter` and `@fontsource-variable/newsreader`.
