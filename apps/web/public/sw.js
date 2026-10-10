/* AgriSense service worker (hand-written, intentionally small).
 *
 * What it does:
 *  - precaches a static offline fallback page, the icons and the manifest;
 *  - caches immutable static assets (/_next/static/*, /icons/*) after first use;
 *  - serves /offline.html when a page navigation fails because the network is down.
 *
 * What it NEVER does: cache /api/* or any HTML/data that could be user-specific.
 * Navigations are always network-first and their responses are never stored.
 * This is NOT full offline support: data screens need a connection.
 */
const VERSION = "v1";
const STATIC_CACHE = `agrisense-static-${VERSION}`;
const PRECACHE = ["/offline.html", "/icons/icon.svg", "/icons/icon-192.png", "/icons/icon-512.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("agrisense-") && k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Hard rule: the API and anything authenticated bypass the worker completely.
  if (url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
