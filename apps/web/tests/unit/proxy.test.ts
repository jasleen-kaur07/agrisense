import { afterEach, describe, expect, it, vi } from "vitest";
import { forwardToGateway } from "@/lib/proxy";

afterEach(() => {
  delete process.env.GATEWAY_URL;
});

describe("gateway proxy", () => {
  it("reads GATEWAY_URL at request time and forwards cookie, CSRF and body", async () => {
    process.env.GATEWAY_URL = "http://gw.test:9999/";
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200, headers: { "content-type": "application/json" } }));
    const req = new Request("http://web.local/api/v1/farms?x=1", {
      method: "POST",
      headers: {
        cookie: "as_access=a; as_csrf=c", "x-csrf-token": "c", origin: "http://web.local",
        "content-type": "application/json", "x-internal-token": "evil", host: "web.local",
      },
      body: JSON.stringify({ name: "n" }),
    });
    await forwardToGateway(req, fetchImpl as unknown as typeof fetch);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://gw.test:9999/api/v1/farms?x=1");
    const h = init.headers as Headers;
    expect(h.get("cookie")).toBe("as_access=a; as_csrf=c");
    expect(h.get("x-csrf-token")).toBe("c");
    expect(h.get("origin")).toBe("http://web.local");
    expect(h.get("x-internal-token")).toBeNull();
    expect(h.get("host")).toBeNull();
    expect(init.method).toBe("POST");
    expect(init.redirect).toBe("manual");
    expect(init.body).toBeTruthy();
  });

  it("passes every Set-Cookie through separately and keeps status/body", async () => {
    const up = new Headers({ "content-type": "application/json" });
    up.append("set-cookie", "as_access=1; Path=/; HttpOnly");
    up.append("set-cookie", "as_refresh=2; Path=/api/v1/auth; HttpOnly");
    up.append("set-cookie", "as_csrf=3; Path=/");
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ id: "u" }), { status: 201, headers: up }));
    const res = await forwardToGateway(new Request("http://web.local/api/v1/auth/login", { method: "POST", body: "{}" }), fetchImpl as unknown as typeof fetch);
    expect(res.status).toBe(201);
    expect(res.headers.getSetCookie()).toEqual([
      "as_access=1; Path=/; HttpOnly",
      "as_refresh=2; Path=/api/v1/auth; HttpOnly",
      "as_csrf=3; Path=/",
    ]);
    expect(await res.json()).toEqual({ id: "u" });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("returns a 503 problem when the gateway is unreachable", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    });
    const res = await forwardToGateway(new Request("http://web.local/api/v1/farms"), fetchImpl as unknown as typeof fetch);
    expect(res.status).toBe(503);
    expect(res.headers.get("content-type")).toContain("problem+json");
  });

  it("defaults to localhost:8080 and does not forward bodies on GET", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }));
    await forwardToGateway(new Request("http://web.local/api/v1/farms"), fetchImpl as unknown as typeof fetch);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://localhost:8080/api/v1/farms");
    expect(init.body).toBeUndefined();
  });

  it("passes only the last X-Forwarded-For hop, and only when TRUST_FORWARDED_FOR=true", async () => {
    const mk = () => new Request("http://web.local/api/v1/farms", { headers: { "x-forwarded-for": "6.6.6.6, 203.0.113.9" } });
    const run = async () => {
      const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));
      await forwardToGateway(mk(), fetchImpl as unknown as typeof fetch);
      return new Headers((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].headers).get("x-forwarded-for");
    };
    vi.stubEnv("TRUST_FORWARDED_FOR", "false");
    expect(await run()).toBeNull();
    vi.stubEnv("TRUST_FORWARDED_FOR", "true");
    expect(await run()).toBe("203.0.113.9");
    vi.unstubAllEnvs();
  });
});
