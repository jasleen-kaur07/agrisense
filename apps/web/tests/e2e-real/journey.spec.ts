import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { asOwnVisitor, registerAndOnboardReal, uniqueEmail } from "./helpers";

test.use({ permissions: ["geolocation"], geolocation: { latitude: 26.85, longitude: 80.95 } });

test("REAL STACK journey: landing -> register -> onboarding(GPS) -> guide -> why -> compare -> plan -> history -> logout", async ({ page, context }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Get crop guidance" }).first().click();
  await registerAndOnboardReal(page, uniqueEmail("journey"));

  const cookies = await context.cookies();
  expect(cookies.find((c) => c.name === "as_access")?.httpOnly).toBe(true);
  expect(cookies.find((c) => c.name === "as_refresh")?.httpOnly).toBe(true);
  expect(cookies.find((c) => c.name === "as_csrf")?.httpOnly).toBe(false);

  // Overview: real weather with an honest status badge and attribution
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Asha Devi");
  const badge = page.getByTestId("weather-status").first();
  await expect(badge).toHaveText(/Live|Cached|Unavailable/);
  await expect(page.getByText("Weather data by Open-Meteo.com").first()).toBeVisible();
  expect(await page.locator("body").innerText()).not.toMatch(/best crop|suitab|probab|87%|Aditya|2,390/i);

  // Crop advice -> analyse -> result (real recommendation through gateway -> farm-advisory -> data-service)
  await page.getByRole("link", { name: "Find crops for this season" }).click();
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page).toHaveURL(/\/crop-advice\/result\//, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: /Crops historically grown in Lucknow/ })).toBeVisible();
  const list = page.getByTestId("guide-crops");
  await expect(list).toBeVisible();
  const listText = await list.innerText();
  expect(listText.length).toBeGreaterThan(20);
  await expect(page.getByText("historical prevalence").first()).toBeVisible();
  await expect(page.getByText(/years/i).first()).toBeVisible(); // coverage block
  const status = page.getByTestId("weather-status");
  await expect(status).toHaveText(/Live|Cached|Unavailable/);
  const resultUrl = page.url();
  const bodyText = await page.locator("main").innerText();
  expect(bodyText).not.toMatch(/best crop|suitab|probab/i);

  // Why
  await page.getByRole("link", { name: "Why this ranking?" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "About this ranking" })).toBeVisible();
  await expect(page.getByText(/not a suitability prediction/i)).toBeVisible();

  // Compare the first two real crops
  await page.goto(resultUrl + "/compare");
  const boxes = page.getByRole("checkbox");
  await boxes.nth(0).check();
  await boxes.nth(1).check();
  await page.getByRole("button", { name: "Compare selected crops" }).click();
  const table = page.getByRole("table");
  await expect(table).toContainText("prevalence", { ignoreCase: true });
  expect(await table.innerText()).not.toMatch(/suitab|water need|price|yield/i);

  // Action plan for the first listed crop
  await page.goto(resultUrl);
  await page.getByRole("link", { name: /Action plan for/ }).first().click();
  await expect(page.getByRole("heading", { name: "Official resources" })).toBeVisible();
  await expect(page.locator('main a[href^="https://soilhealth.dac.gov.in"]')).toBeVisible();
  await expect(page.getByText(/not agronomic advice/i)).toBeVisible();

  // History + regional + season + schemes + weather pages
  await page.goto("/more/history");
  await expect(page.getByRole("link", { name: /North plot/ }).first()).toBeVisible();
  await page.goto("/insights/weather");
  await expect(page.getByText("Weather data by Open-Meteo.com").first()).toBeVisible();
  await page.goto("/more/season");
  await expect(page.getByText(/Simplified calendar convention/)).toBeVisible();
  await page.goto("/more/regional");
  await page.goto("/more/schemes");
  await expect(page.getByText(/does not reproduce/)).toBeVisible();

  // Accessibility on a real result page
  await page.goto(resultUrl);
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);

  // Logout is real: cookies cleared and protected pages redirect
  await page.goto("/more/settings");
  await page.getByRole("button", { name: /Sign out/ }).first().click();
  await expect(page).toHaveURL(/\/($|login)/);
  await page.goto("/overview");
  await expect(page).toHaveURL(/\/login/);
});

test("manual state/district selection works (no GPS) and soil can stay empty", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await registerAndOnboardReal(page, uniqueEmail("manual"), { gps: false });
  await page.goto("/more/settings");
  await expect(page.getByRole("region", { name: "Farms & fields" })).toBeVisible();
  await ctx.close();
});

test("ownership and auth: another user cannot read a recommendation; anonymous is redirected", async ({ browser, request }) => {
  const ctxA = await browser.newContext({ permissions: ["geolocation"], geolocation: { latitude: 26.85, longitude: 80.95 } });
  const a = await ctxA.newPage();
  await registerAndOnboardReal(a, uniqueEmail("ownerA"));
  await a.goto("/crop-advice");
  await a.getByRole("button", { name: "Start" }).click();
  await expect(a).toHaveURL(/\/crop-advice\/result\//, { timeout: 30_000 });
  const url = a.url();

  const ctxB = await browser.newContext({ permissions: ["geolocation"], geolocation: { latitude: 26.85, longitude: 80.95 } });
  const b = await ctxB.newPage();
  await registerAndOnboardReal(b, uniqueEmail("ownerB"));
  await b.goto(url);
  await expect(b.getByTestId("guide-crops")).toBeHidden({ timeout: 15_000 }); // B must never see A's recommendation
  await b.screenshot({ path: "test-results/ownership-b-view.png" });
  const apiStatus = await b.evaluate(async (u) => (await fetch("/api/v1/recommendations/" + u.split("/").pop())).status, url);
  expect(apiStatus).toBe(404);

  const anon = await request.get("/api/v1/farms");
  expect(anon.status()).toBe(401);
  await ctxA.close();
  await ctxB.close();
});

test("admin area: farmers are blocked, the bootstrap admin sees stats", async ({ browser }) => {
  const farmerCtx = await browser.newContext({ permissions: ["geolocation"], geolocation: { latitude: 26.85, longitude: 80.95 } });
  const f = await farmerCtx.newPage();
  await registerAndOnboardReal(f, uniqueEmail("notadmin"));
  const res = await f.request.get("/api/v1/admin/stats");
  expect(res.status()).toBe(403);
  await farmerCtx.close();

  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await asOwnVisitor(page);
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.ADMIN_EMAIL ?? "admin@agrisense.local");
  await page.getByLabel("Password").fill(process.env.ADMIN_PASSWORD ?? "change-me-admin-pass");
  await page.getByRole("button", { name: "Sign in" }).last().click();
  await expect(page).toHaveURL(/\/(overview|onboarding)/);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: /Admin/i }).first()).toBeVisible();
  await expect(page.getByText(/UNVERIFIED/)).toBeVisible(); // dataset licence status surfaced to admins
  await ctx.close();
});

test("PWA: manifest, icons, service worker, offline fallback; /api is never cached", async ({ page, context }) => {
  await page.goto("/");
  const manifest = await (await page.request.get("/manifest.webmanifest")).json();
  expect(manifest.name).toBe("AgriSense");
  expect(manifest.display).toBe("standalone");
  const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
  expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  for (const icon of manifest.icons) expect((await page.request.get(icon.src)).status()).toBe(200);

  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  const swCaches = await page.evaluate(async () => {
    const out: string[] = [];
    for (const name of await caches.keys()) for (const req of await (await caches.open(name)).keys()) out.push(new URL(req.url).pathname);
    return out;
  });
  expect(swCaches.some((p) => p.startsWith("/api/"))).toBe(false);

  await context.setOffline(true);
  await page.goto("/more/regional").catch(() => undefined);
  await expect(page).toHaveTitle("Offline | AgriSense", { timeout: 10_000 }); // the app's own fallback, not the browser error page
  await expect(page.getByRole("heading", { name: "You are offline" })).toBeVisible();
  await context.setOffline(false);
});
