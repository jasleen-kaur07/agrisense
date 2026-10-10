import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch, api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

const json = (status: number, body?: unknown, headers: Record<string, string> = {}) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "content-type": status >= 400 ? "application/problem+json" : "application/json", ...headers },
  });

describe("api client", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "as_csrf=tok123; path=/";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    document.cookie = "as_csrf=; path=/; max-age=0";
  });

  it("sends X-CSRF-Token and credentials on unsafe methods", async () => {
    fetchMock.mockResolvedValue(json(200, { ok: true }));
    await api.put("/profile", { language: "hi" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/profile");
    expect(init.credentials).toBe("include");
    expect(init.headers["X-CSRF-Token"]).toBe("tok123");
  });

  it("does not send CSRF on GET or on login/register/forgot/reset", async () => {
    fetchMock.mockImplementation(async () => json(200, {}));
    await api.get("/farms");
    await api.post("/auth/login", { email: "a@b.c", password: "x" });
    await api.post("/auth/register", {});
    await api.post("/auth/forgot", {});
    await api.post("/auth/reset", {});
    for (const [, init] of fetchMock.mock.calls) expect(init.headers["X-CSRF-Token"]).toBeUndefined();
  });

  it("sends CSRF on refresh and logout", async () => {
    fetchMock.mockResolvedValue(json(204));
    await api.post("/auth/logout");
    expect(fetchMock.mock.calls[0][1].headers["X-CSRF-Token"]).toBe("tok123");
  });

  it("refreshes once on 401 and retries the original call", async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { title: "Unauthorized", status: 401 }))
      .mockResolvedValueOnce(json(204))
      .mockResolvedValueOnce(json(200, [{ id: "f1" }]));
    const out = await apiFetch<unknown[]>("/farms", { noRedirect: true });
    expect(out).toEqual([{ id: "f1" }]);
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual(["/api/v1/farms", "/api/v1/auth/refresh", "/api/v1/farms"]);
    expect(fetchMock.mock.calls[1][1].method).toBe("POST");
  });

  it("gives up with ApiError when refresh fails (no retry loop)", async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { title: "Unauthorized", status: 401 }))
      .mockResolvedValueOnce(json(401, { title: "Unauthorized", status: 401 }));
    await expect(apiFetch("/farms", { noRedirect: true })).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not try to refresh for login failures", async () => {
    fetchMock.mockResolvedValue(json(401, { title: "Unauthorized", status: 401 }));
    await expect(api.post("/auth/login", {})).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("parses problem+json with field errors and traceId", async () => {
    fetchMock.mockResolvedValue(
      json(422, {
        type: "t", title: "Validation failed", status: 422, detail: "bad", traceId: "abc-1",
        errors: [{ field: "areaAcres", message: "must be greater than 0" }],
      }),
    );
    const err = (await api.post("/farms/x/fields", {}).catch((e: ApiError) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(422);
    expect(err.title).toBe("Validation failed");
    expect(err.detail).toBe("bad");
    expect(err.traceId).toBe("abc-1");
    expect(err.fieldMessages).toEqual({ areaAcres: "must be greater than 0" });
  });

  it("maps network failure to status 0", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const err = (await api.get("/farms").catch((e: ApiError) => e)) as ApiError;
    expect(err.status).toBe(0);
    expect(err.isNetworkError).toBe(true);
  });

  it("serialises query params and skips empty ones", async () => {
    fetchMock.mockResolvedValue(json(200, {}));
    await api.get("/regional/guide", { state: "A B", district: "", season: "RABI" });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/regional/guide?state=A+B&season=RABI");
  });
});
