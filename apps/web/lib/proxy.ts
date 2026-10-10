const HOP_BY_HOP = new Set([
  "connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer",
  "transfer-encoding", "upgrade", "host", "content-length",
]);
/** The gateway authoritatively sets these; never let the browser inject them. */
const STRIP_REQUEST = new Set(["x-internal-token", "x-forwarded-host", "x-forwarded-proto", "x-forwarded-for"]);

export function gatewayUrl(): string {
  return (process.env.GATEWAY_URL || "http://localhost:8080").replace(/\/+$/, "");
}

export async function forwardToGateway(
  req: Request,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const incoming = new URL(req.url);
  // Keep the /api/... path exactly; the gateway owns /api/v1/*.
  const target = `${gatewayUrl()}${incoming.pathname}${incoming.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (HOP_BY_HOP.has(k) || STRIP_REQUEST.has(k)) return;
    headers.set(key, value);
  });
  headers.set("x-forwarded-host", incoming.host);
  headers.set("x-forwarded-proto", incoming.protocol.replace(":", ""));

  const hasBody = !["GET", "HEAD"].includes(req.method.toUpperCase());
  const init: RequestInit & { duplex?: "half" } = {
    method: req.method,
    headers,
    redirect: "manual",
    body: hasBody ? req.body : undefined,
    ...(hasBody ? { duplex: "half" as const } : {}),
  };

  let upstream: Response;
  try {
    upstream = await fetchImpl(target, init);
  } catch {
    return new Response(
      JSON.stringify({
        type: "https://agrisense.local/problems/upstream-unavailable",
        title: "Service unavailable",
        status: 503,
        detail: "The AgriSense service could not be reached. Please try again shortly.",
        instance: incoming.pathname,
      }),
      { status: 503, headers: { "content-type": "application/problem+json" } },
    );
  }

  const out = new Headers();
  upstream.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    // fetch() already decoded the body, so drop encoding/length; set-cookie is handled below.
    if (HOP_BY_HOP.has(k) || k === "content-encoding" || k === "set-cookie") return;
    out.set(key, value);
  });
  for (const cookie of upstream.headers.getSetCookie()) out.append("set-cookie", cookie);
  out.set("cache-control", "no-store");

  return new Response(upstream.status === 204 || upstream.status === 304 ? null : upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: out,
  });
}
