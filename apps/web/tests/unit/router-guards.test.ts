import { createMemoryHistory } from "vue-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAppRouter } from "@/router";
import { clearQueries } from "@/lib/query";
import { useSessionStore } from "@/stores/session";
import type { User } from "@/lib/api/types";
import { freshApp, json, setLocale, stubFetch } from "./helpers";

const user = (over: Partial<User> = {}): User => ({ id: "u1", email: "a@b.co", roles: ["FARMER"], language: "en", onboardingCompleted: true, enabled: true, ...over });

/** /auth/me answers with `me` (or 401); /auth/refresh always 401. */
function api(me: User | number) {
  return stubFetch((url) => {
    if (url.startsWith("/api/v1/auth/me")) return typeof me === "number" ? json(me, { title: "x", status: me }) : json(200, me);
    return json(401, { title: "Unauthorized", status: 401 });
  });
}
const meCalls = (f: ReturnType<typeof api>) => f.mock.calls.filter((c) => String(c[0]).includes("/auth/me")).length;

async function go(path: string) {
  const router = createAppRouter(createMemoryHistory());
  await router.push(path);
  await router.isReady();
  return router;
}

describe("router guards", () => {
  beforeEach(() => {
    clearQueries();
    freshApp();
    document.cookie = "as_csrf=tok; path=/";
  });

  it("signed-out visitors are sent to /login?next=<original>", async () => {
    api(401);
    const r = await go("/crop-advice/result/abc?x=1");
    expect(r.currentRoute.value.path).toBe("/login");
    expect(r.currentRoute.value.query.next).toBe("/crop-advice/result/abc?x=1");
  });

  it("does one silent refresh attempt before deciding the user is signed out", async () => {
    const f = api(401);
    await go("/overview");
    const urls = f.mock.calls.map((c) => c[0]);
    expect(urls).toEqual(["/api/v1/auth/me", "/api/v1/auth/refresh"]);
  });

  it("login/register make no request for visitors who never signed in (no as_csrf cookie)", async () => {
    document.cookie = "as_csrf=; path=/; max-age=0";
    const f = api(401);
    expect((await go("/login")).currentRoute.value.path).toBe("/login");
    expect((await go("/register")).currentRoute.value.path).toBe("/register");
    expect(f).not.toHaveBeenCalled();
  });

  it("public pages never call /auth/me", async () => {
    const f = api(401);
    for (const p of ["/", "/how-it-works", "/forgot-password", "/reset-password?token=t"]) await go(p);
    expect(f).not.toHaveBeenCalled();
  });

  it("loads the session once and reuses it for later navigations", async () => {
    const f = api(user());
    const r = await go("/overview");
    expect(r.currentRoute.value.path).toBe("/overview");
    await r.push("/more/history");
    await r.push("/insights/weather");
    expect(meCalls(f)).toBe(1);
  });

  it("users who have not finished onboarding are sent to /onboarding from every app route", async () => {
    api(user({ onboardingCompleted: false }));
    const r = await go("/overview");
    expect(r.currentRoute.value.path).toBe("/onboarding");
    await r.push("/more/settings");
    expect(r.currentRoute.value.path).toBe("/onboarding");
  });

  it("finished users do not see /onboarding again", async () => {
    api(user());
    expect((await go("/onboarding")).currentRoute.value.path).toBe("/overview");
  });

  it("signed-in users visiting /login or /register go to /overview (or /onboarding)", async () => {
    api(user());
    expect((await go("/login")).currentRoute.value.path).toBe("/overview");
    expect((await go("/register")).currentRoute.value.path).toBe("/overview");
    freshApp();
    clearQueries();
    api(user({ onboardingCompleted: false }));
    expect((await go("/login")).currentRoute.value.path).toBe("/onboarding");
  });

  it("login honours a safe ?next but ignores an open redirect", async () => {
    api(user());
    expect((await go("/login?next=/crop-advice")).currentRoute.value.path).toBe("/crop-advice");
    expect((await go("/login?next=//evil.example")).currentRoute.value.path).toBe("/overview");
  });

  it("/admin needs the ADMIN role (UX only)", async () => {
    api(user());
    expect((await go("/admin")).currentRoute.value.path).toBe("/overview");
    freshApp();
    clearQueries();
    api(user({ roles: ["ADMIN"] }));
    expect((await go("/admin")).currentRoute.value.path).toBe("/admin");
  });

  it("a server/network failure of /auth/me does not bounce the user to /login", async () => {
    api(503);
    const r = await go("/overview");
    expect(r.currentRoute.value.path).toBe("/overview");
    const session = useSessionStore();
    expect(session.user).toBeNull();
    expect(session.error).toBeTruthy();
  });

  it("unknown URLs reach the 404 route", async () => {
    const r = await go("/definitely/not/here");
    expect(r.currentRoute.value.name).toBe("not-found");
  });

  it("document.title follows the route and the language", async () => {
    api(user());
    const r = await go("/more/schemes");
    expect(document.title).toBe("Government Schemes | AgriSense");
    setLocale("hi");
    await r.push("/more/alerts");
    expect(document.title).toBe("अलर्ट | AgriSense");
    setLocale("en");
    await r.push("/how-it-works");
    expect(document.title).toBe("How AgriSense works | AgriSense");
    await r.push("/");
    expect(document.title).toBe("AgriSense");
  });
});

vi.mock("@/lib/api/client", async (orig) => {
  // Never hard-navigate to /login from tests; the guard handles redirects.
  const real = await orig<typeof import("@/lib/api/client")>();
  return { ...real, redirectToLogin: () => undefined };
});
