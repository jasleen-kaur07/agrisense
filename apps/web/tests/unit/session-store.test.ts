import { beforeEach, describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { clearQueries } from "@/lib/query";
import { useLocaleStore } from "@/stores/locale";
import { useSessionStore } from "@/stores/session";
import { freshApp, json, stubFetch } from "./helpers";

const farmer = { id: "u1", email: "a@b.co", roles: ["FARMER"], language: "hi", onboardingCompleted: true, enabled: true };

describe("session store", () => {
  beforeEach(() => {
    clearQueries();
    freshApp();
    document.cookie = "as_csrf=tok; path=/";
  });

  it("ensureLoaded calls /auth/me once and exposes the user", async () => {
    const f = stubFetch(() => json(200, farmer));
    const s = useSessionStore();
    await Promise.all([s.ensureLoaded(), s.ensureLoaded()]);
    await s.ensureLoaded();
    expect(f).toHaveBeenCalledTimes(1);
    expect(s.user?.email).toBe("a@b.co");
    expect(s.isAdmin).toBe(false);
    expect(s.loaded).toBe(true);
  });

  it("401 means signed out (no error); other failures set error and are retried", async () => {
    let status = 401;
    const f = stubFetch((url) => (url.includes("refresh") ? json(401, { title: "x", status: 401 }) : status === 200 ? json(200, farmer) : json(status, { title: "t", status })));
    const s = useSessionStore();
    await s.ensureLoaded();
    expect(s.user).toBeNull();
    expect(s.error).toBeNull();

    const s2 = (freshApp(), useSessionStore());
    status = 503;
    await s2.ensureLoaded();
    expect(s2.error).toBeInstanceOf(ApiError);
    const before = f.mock.calls.length;
    status = 200;
    await s2.ensureLoaded();
    expect(f.mock.calls.length).toBeGreaterThan(before);
    expect(s2.user?.id).toBe("u1");
    expect(s2.error).toBeNull();
  });

  it("login stores the user; logout clears it even when the API call fails", async () => {
    stubFetch((url) => (url.includes("/auth/login") ? json(200, { ...farmer, roles: ["ADMIN"] }) : json(500, { title: "boom", status: 500 })));
    const s = useSessionStore();
    const u = await s.login({ email: "a@b.co", password: "x" });
    expect(u.roles).toContain("ADMIN");
    expect(s.isAdmin).toBe(true);
    await s.logout();
    expect(s.user).toBeNull();
    expect(s.isAdmin).toBe(false);
  });

  it("a failed login leaves the store signed out", async () => {
    stubFetch(() => json(401, { title: "Unauthorized", status: 401 }));
    const s = useSessionStore();
    await expect(s.login({ email: "a@b.co", password: "bad" })).rejects.toMatchObject({ status: 401 });
    expect(s.user).toBeNull();
  });
});

describe("locale store", () => {
  beforeEach(() => {
    freshApp();
    document.cookie = "as_lang=; path=/; max-age=0";
    localStorage.clear();
  });

  it("setLang updates <html lang>, the cookie and localStorage", () => {
    const l = useLocaleStore();
    l.setLang("hi");
    expect(document.documentElement.lang).toBe("hi");
    expect(document.cookie).toContain("as_lang=hi");
    expect(localStorage.getItem("as_lang")).toBe("hi");
    l.setLang("en");
  });

  it("adopts the user's saved language only when the visitor has not chosen one", () => {
    const l = useLocaleStore();
    l.explicit = false;
    l.adoptUserLang("hi");
    expect(l.lang).toBe("hi");
    l.setLang("en");
    l.adoptUserLang("hi");
    expect(l.lang).toBe("en");
  });
});
