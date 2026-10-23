#!/usr/bin/env bash
# Tests the nginx proxy/static configuration of the web image against a throw-away fake gateway.
# Shows both X-Forwarded-For modes (TRUST_CLIENT_FORWARDED_FOR=false and =true). Needs Docker and curl.
#   bash scripts/test-nginx.sh            # builds the image first
#   IMAGE=agrisense-web bash scripts/test-nginx.sh   # reuse an existing image
set -u
cd "$(dirname "$0")/.."
IMAGE="${IMAGE:-agrisense-web:nginx-test}"
NET="agrisense-web-nginx-test"
PASS=0; FAIL=0

check() { # name, condition-result (0 = ok), detail
  if [ "$2" -eq 0 ]; then PASS=$((PASS+1)); echo "  ok   $1"; else FAIL=$((FAIL+1)); echo "  FAIL $1 :: $3"; fi
}
has()  { grep -qF -- "$2" <<<"$1"; }
cleanup() { docker rm -f "$NET-web" "$NET-gw" >/dev/null 2>&1; docker network rm "$NET" >/dev/null 2>&1; rm -f "$TMP" "$TMP.big"; }
trap cleanup EXIT
TMP="$(mktemp)"

if [ -z "${SKIP_BUILD:-}" ] && [ "$IMAGE" = "agrisense-web:nginx-test" ]; then docker build -q -t "$IMAGE" . >/dev/null || { echo "build failed"; exit 1; }; fi
docker network create "$NET" >/dev/null 2>&1

# Fake gateway: echoes the headers it received, sets two cookies and a cacheable header.
cat >"$TMP" <<'CONF'
server {
  listen 8080;
  location / {
    add_header Set-Cookie "as_access=1; Path=/; HttpOnly" always;
    add_header Set-Cookie "as_csrf=2; Path=/" always;
    add_header Cache-Control "max-age=600" always;
    default_type text/plain;
    return 200 "xff=[$http_x_forwarded_for] proto=[$http_x_forwarded_proto] host=[$http_x_forwarded_host] internal=[$http_x_internal_token] clientip=[$http_x_client_ip] userid=[$http_x_user_id] cookie=[$http_cookie] csrf=[$http_x_csrf_token] idem=[$http_idempotency_key] reqid=[$http_x_request_id] origin=[$http_origin] uri=[$request_uri] method=[$request_method]\n";
  }
}
CONF
docker run -d --name "$NET-gw" --network "$NET" --network-alias fakegw -v "$TMP:/etc/nginx/conf.d/default.conf:ro" nginx:alpine >/dev/null

start_web() { # TRUST value
  docker rm -f "$NET-web" >/dev/null 2>&1
  docker run -d --name "$NET-web" --network "$NET" -p 127.0.0.1:0:3000 -e GATEWAY_URL="http://fakegw:8080/" -e TRUST_CLIENT_FORWARDED_FOR="$1" "$IMAGE" >/dev/null
  PORT="$(docker port "$NET-web" 3000/tcp | head -1 | sed 's/.*://')"
  for _ in $(seq 1 40); do curl -fs "http://127.0.0.1:$PORT/healthz" >/dev/null 2>&1 && return 0; sleep 0.25; done
  echo "web did not become healthy"; docker logs "$NET-web"; exit 1
}
api() { curl -s -i "http://127.0.0.1:$PORT$1" "${@:2}"; }

for MODE in false true; do
  echo "== TRUST_CLIENT_FORWARDED_FOR=$MODE (container restarted) =="
  start_web "$MODE"
  R="$(api /api/v1/farms -X POST -H 'Cookie: as_access=a; as_csrf=c' -H 'X-CSRF-Token: c' -H 'Origin: http://localhost:3000' \
        -H 'Idempotency-Key: k-1' -H 'X-Request-ID: r-1' -H 'X-Internal-Token: evil' -H 'X-Client-IP: 9.9.9.9' -H 'X-User-Id: admin' \
        -H 'X-Forwarded-For: 6.6.6.6, 7.7.7.7' -H 'X-Forwarded-Proto: spoofed' -H 'Content-Type: application/json' -d '{"a":1}')"
  check "gateway receives the original path"        "$(has "$R" 'uri=[/api/v1/farms]'; echo $?)" "$R"
  check "Cookie passed"                              "$(has "$R" 'cookie=[as_access=a; as_csrf=c]'; echo $?)" "$R"
  check "X-CSRF-Token / Origin / Idempotency-Key / X-Request-ID passed" "$( (has "$R" 'csrf=[c]' && has "$R" 'idem=[k-1]' && has "$R" 'reqid=[r-1]' && has "$R" 'origin=[http://localhost:3000]'); echo $?)" "$R"
  check "X-Internal-Token / X-Client-IP / X-User-Id stripped" "$( (has "$R" 'internal=[]' && has "$R" 'clientip=[]' && has "$R" 'userid=[]'); echo $?)" "$R"
  check "X-Forwarded-Proto is set by nginx (client value dropped)" "$(has "$R" 'proto=[http]'; echo $?)" "$R"
  if [ "$MODE" = "false" ]; then
    XFF="$(sed -n 's/.*xff=\[\([^]]*\)\].*/\1/p' <<<"$R")"
    check "X-Forwarded-For OVERWRITTEN with the peer address (got '$XFF')" "$( [ -n "$XFF" ] && ! grep -q '6.6.6.6' <<<"$XFF" && ! grep -q ',' <<<"$XFF"; echo $?)" "$R"
  else
    check "X-Forwarded-For passed through from the client" "$(has "$R" 'xff=[6.6.6.6, 7.7.7.7]'; echo $?)" "$R"
    R2="$(api /api/v1/farms)"
    XFF2="$(sed -n 's/.*xff=\[\([^]]*\)\].*/\1/p' <<<"$R2")"
    check "without a client header the peer address is used (got '$XFF2')" "$( [ -n "$XFF2" ]; echo $?)" "$R2"
  fi
  check "two Set-Cookie headers passed separately"  "$( [ "$(grep -ci '^set-cookie:' <<<"$R")" -eq 2 ]; echo $?)" "$R"
  check "Cache-Control: no-store only (upstream value hidden)" "$( [ "$(grep -ci '^cache-control:' <<<"$R")" -eq 1 ] && grep -qi '^cache-control: no-store' <<<"$R"; echo $?)" "$R"
  head -c 1200000 /dev/zero | tr '\0' 'a' >"$TMP.big"
  CODE="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/api/v1/farms" -X POST -H 'Content-Type: application/json' --data-binary "@$TMP.big")"
  check "request bodies over 1 MB are rejected (413, got $CODE)" "$( [ "$CODE" = 413 ]; echo $?)" ""
done

echo "== static files and headers =="
I="$(api /crop-advice/result/abc/why)"
check "SPA fallback serves index.html for client routes" "$( (has "$I" '200 OK' && has "$I" '<div id="app">'); echo $?)" "$I"
check "index/SPA responses are no-cache"        "$(grep -qi '^cache-control: no-cache' <<<"$I"; echo $?)" "$I"
for h in 'x-content-type-options: nosniff' 'referrer-policy: strict-origin-when-cross-origin' 'x-frame-options: DENY' "frame-ancestors 'none'" "default-src 'self'"; do
  check "header present: $h" "$(grep -qiF -- "$h" <<<"$I"; echo $?)" "$I"
done
ASSET="$(sed -n 's/.*src="\(\/assets\/[^"]*\.js\)".*/\1/p' <<<"$I" | head -1)"
A="$(api "$ASSET")"
check "hashed asset is immutable ($ASSET)"       "$(grep -qi 'cache-control: public, max-age=31536000, immutable' <<<"$A"; echo $?)" "$A"
check "missing asset is a real 404 (no SPA fallback)" "$(has "$(api /assets/nope.js)" '404'; echo $?)" ""
for f in /sw.js /manifest.webmanifest /offline.html /index.html; do
  F="$(api $f)"; check "$f: no-cache" "$( (has "$F" '200 OK' && grep -qi '^cache-control: no-cache' <<<"$F"); echo $?)" "$F"
done
check "/healthz answers" "$(has "$(api /healthz)" 'ok'; echo $?)" ""
docker rm -f "$NET-gw" >/dev/null
D="$(api /api/v1/farms)"
check "gateway down: 503 application/problem+json" "$( (has "$D" '503' && grep -qi 'application/problem+json' <<<"$D" && has "$D" 'upstream-unavailable'); echo $?)" "$D"

echo; echo "passed: $PASS  failed: $FAIL"
[ "$FAIL" -eq 0 ]
