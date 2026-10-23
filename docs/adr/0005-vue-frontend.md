# ADR 0005: Vue 3 SPA with an nginx proxy replaces the Next.js frontend

Status: accepted, 2026-10-10.

**Decision.** `apps/web` is a Vue 3 + TypeScript + Vite single-page app (Vue Router, Pinia, Tailwind v4, vue-i18n, Zod),
served by nginx, which also reverse-proxies `/api/*` to the gateway. The Next.js implementation is kept, unchanged and
read-only, in `apps/web-next-legacy` as a reference.

**Reason.** Vue is the team's intended stack. Behaviour, wording, API contracts and tests were ported 1:1, so nothing the
user sees or the backend relies on changed.

**Consequences.**
- No server rendering and no server middleware: route protection is a Vue Router global guard backed by a session store
  that calls `GET /auth/me` once per page load (cookies are HttpOnly). It is UX only; the backend still enforces auth.
- The `/api` proxy moved from a Next route handler to nginx (`GATEWAY_URL` is read at container start). nginx is the
  trusted proxy: it **overwrites** `X-Forwarded-For` with the peer address, so the gateway's per-IP rate limits cannot be
  spoofed by clients; it also strips client `X-Internal-Token`/`X-Client-IP`/`X-User-*`.
- `TRUST_CLIENT_FORWARDED_FOR=true` (local/test only, set in Compose) passes the client's header through so one machine can
  simulate many visitors. Production keeps the default `false` and must put a trusted proxy in front. This replaces the
  Next-specific `TRUST_FORWARDED_FOR`.
- A strict CSP is possible (no inline script/style, no eval; Zod runs in `jitless` mode). Fonts are self-hosted, so the build
  needs no network for fonts.
- The Docker image no longer contains Node at runtime (nginx-unprivileged on port 3000).
