# AgriSense web

Next.js 16 (App Router) + TypeScript (strict) + Tailwind v4 PWA. It talks only to the public API
contracts (`contracts/identity.yaml`, `farm-advisory.yaml`, `data.yaml`) under `/api/v1`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | dev server on :3000 (`GATEWAY_URL` default `http://localhost:8080`) |
| `npm run build` / `npm start` | production build (standalone output) |
| `npm run lint` / `npm run typecheck` | ESLint / `tsc --noEmit` |
| `npm test` | Vitest + Testing Library unit tests |
| `npm run e2e` | build, then Playwright (desktop + mobile) against the **DEMO mock API** |
| `npm run mock-api` | start the DEMO mock API alone on :8090 (`MOCK_PORT`, `MOCK_HOST`) |
| `npm run icons` | regenerate PNG icons from the leaf mark (needs `sharp`) |

First time: `npx playwright install chromium`.

## Running

Against the mock (no backend needed):

```
npm run mock-api &                      # DEMO data, port 8090
GATEWAY_URL=http://127.0.0.1:8090 npm run dev
```
Register any email (use `admin@demo.test` to get the ADMIN role). Mock records are labelled DEMO and live only in `tests/mock-api`, which is excluded from the Docker image and the bundle.

Against the real gateway: `GATEWAY_URL=http://localhost:8080 npm run dev` (or set it in the container environment).

Docker: `docker build -t agrisense-web .` then `docker run -p 3000:3000 -e GATEWAY_URL=http://gateway:8080 agrisense-web`.
The build downloads Google Fonts (Inter, Newsreader) through `next/font`, so it needs network access.

## API proxy

`app/api/[...path]/route.ts` (logic in `lib/proxy.ts`) forwards `/api/*` to `${GATEWAY_URL}/api/*` per request, so
`GATEWAY_URL` is runtime configuration (Next rewrites would freeze it at build time). It forwards the `Cookie`, `Origin`,
`X-CSRF-Token`, `Idempotency-Key` headers and every `Set-Cookie` separately, never caches, strips `X-Internal-Token`, and
returns a 503 problem+json if the gateway is unreachable.

## Auth model (browser)

The app never stores tokens. `as_access`/`as_refresh` are HttpOnly (set by the backend); the client reads the
non-HttpOnly `as_csrf` cookie and sends it as `X-CSRF-Token` on POST/PUT/PATCH/DELETE (except login/register/forgot/reset).
On a 401 for any other call `lib/api/client.ts` does one shared `POST /auth/refresh` and retries once, then redirects to
`/login?next=...`. `proxy.ts` (Next 16's middleware) only checks that an auth cookie exists (UX). Because `as_refresh` is scoped
to `/api/v1/auth`, page requests only see `as_access`; when it has expired the login page makes one silent session resume
attempt (only when `?next=` is present) before showing the form. The Admin nav item is UX only; the backend enforces ADMIN.

## Structure

```
app/            routes: (public) landing/auth, (app) authenticated pages, api/[...path] proxy, manifest
components/     ui primitives, layout (shells, nav), data (loading/error/empty), weather, advice, location
features/       auth, onboarding, farms, advice, overview, insights, more, settings, admin, marketing
lib/            api client + typed endpoints, i18n, proxy, hooks, format
messages/       en.json, hi.json (hi needs native-speaker review)
public/         sw.js, offline.html, icons
tests/          unit (Vitest), e2e (Playwright), mock-api (DEMO server)
```
No agricultural logic lives in components: they render what the API returns (ranks, percentages, caveats, season rule).

## i18n

Hand-rolled (`lib/i18n`). All user-visible strings are in `messages/*.json`; `tests/unit/i18n.test.ts` checks key parity,
placeholders, and that every literal `t("key")` exists. Choice is kept in the `as_lang` cookie (+ localStorage fallback) and,
when signed in, saved with `PUT /profile`. Crop names, season rule text, caveats and alerts come from the API and are not translated.

## PWA

`app/manifest.ts`, icons in `public/icons` (SVG, 192/512, maskable), hand-written `public/sw.js`. The worker precaches only
`/offline.html`, icons and the manifest, caches `/_next/static/*` and `/icons/*` after first use, and serves `/offline.html`
when a navigation fails. It never touches `/api/*` and never stores any HTML or data. This is not full offline support:
data screens need a connection and show an offline state.

## Design tokens

Extracted from `design-refs/AgriSense_V14...html` (final `:root` override) into `app/globals.css`:
paper `#f4f0e7`, surface `#fffdf8`, ink `#252b28`, forest `#19342d`, olive `#6f7f50`, terracotta `#b96e51`, ochre `#b99a59`,
dusty blue `#708c94` (weather), line `#dcd8cd`. Text-bearing accents use darker `-ink` variants (olive-ink `#52623a`,
terracotta-ink `#8f4a30`, ochre-ink `#6f5a22`, blue-ink `#3f5a62`, muted `#5f6760`) so pairs meet WCAG AA (checked: 4.5:1 or better).
Headings use Newsreader (serif), body Inter; borders instead of shadows. The design file's demo values are never used.

## Deviations / notes

- Admin feedback response shape is unspecified in the contract; the admin page accepts an array or a page object.
- GPS (`GET /locations/nearest`) is opt-in by explicit button click in onboarding and the farm form; coordinates are not stored.
