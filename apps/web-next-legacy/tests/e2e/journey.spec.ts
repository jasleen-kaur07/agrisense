import { expect, test } from "@playwright/test";
import { registerAndOnboard, resetMock } from "./helpers";

test.use({ permissions: ["geolocation"], geolocation: { latitude: 20, longitude: 78 } });

test.beforeAll(resetMock);

test("critical journey: landing to history (DEMO mock API)", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("district");
  await page.getByRole("link", { name: "Get crop guidance" }).first().click();
  await expect(page).toHaveURL(/\/register/);

  await registerAndOnboard(page, "farmer@demo.test", { gps: true });

  // Cookies: backend-set HttpOnly cookies are present and JS cannot see them, but the csrf cookie is readable.
  const cookies = await context.cookies();
  expect(cookies.find((c) => c.name === "as_access")?.httpOnly).toBe(true);
  expect(cookies.find((c) => c.name === "as_csrf")?.httpOnly).toBe(false);
  expect(await page.evaluate(() => document.cookie)).not.toContain("as_access");

  // Overview: honest wording, weather badge, no demo numbers from the design file.
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Hello, Demo Farmer");
  await expect(page.getByTestId("weather-status").first()).toHaveText("Live");
  await expect(page.getByText("Weather data by Open-Meteo.com").first()).toBeVisible();
  const body = await page.locator("body").innerText();
  expect(body).not.toMatch(/best crop|suitab|probab|87%|Aditya|2,390/i);

  // Crop advice -> analyse -> result
  await page.getByRole("link", { name: "Find crops for this season" }).click();
  await expect(page).toHaveURL(/\/crop-advice$/);
  await expect(page.getByLabel(/North plot/)).toBeChecked(); // single field is preselected
  await expect(page.getByLabel("Season")).toHaveValue("KHARIF");
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page).toHaveURL(/\/crop-advice\/result\//, { timeout: 20_000 });

  await expect(page.getByRole("heading", { name: /Crops historically grown in Demo District A/ })).toBeVisible();
  await expect(page.getByTestId("guide-crops").getByText("Demo Crop A")).toBeVisible();
  await expect(page.getByText("historical prevalence").first()).toBeVisible();
  await expect(page.getByText(/Not enough records exist/)).toBeVisible();
  await expect(page.getByText(/DEMO data: historical share/)).toBeVisible();
  await expect(page.getByTestId("weather-status")).toHaveText("Live");
  const resultUrl = page.url();

  // Why
  await page.getByRole("link", { name: "Why this ranking?" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "About this ranking" })).toBeVisible();
  await expect(page.getByText(/not a suitability prediction/i)).toBeVisible();
  await expect(page.getByText(/80%/)).toBeVisible();

  // Compare
  await page.goto(resultUrl + "/compare");
  await page.getByLabel("Demo Crop A").check();
  await page.getByLabel("Demo Crop B").check();
  await page.getByRole("button", { name: "Compare selected crops" }).click();
  await expect(page.getByRole("table")).toContainText("Historical prevalence");
  await expect(page.getByRole("table")).toContainText("41.2%");

  // Action plan
  await page.goto(resultUrl);
  await page.getByRole("link", { name: "Action plan for Demo Crop A" }).click();
  await expect(page.getByRole("heading", { name: "Official resources" })).toBeVisible();
  await expect(page.getByRole("link", { name: /soilhealth\.dac\.gov\.in/ })).toHaveAttribute("href", "https://soilhealth.dac.gov.in/");
  await expect(page.getByText(/DEMO disclaimer/)).toBeVisible();

  // History
  await page.goto("/more/history");
  await expect(page.getByRole("link", { name: /North plot/ }).first()).toBeVisible();
  await page.getByRole("link", { name: "Open" }).first().click();
  await expect(page).toHaveURL(/\/crop-advice\/result\//);
});

test("insights pages are honest and schemes link to official portals only", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("farmer@demo.test");
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Sign in" }).last().click();
  await expect(page).toHaveURL(/\/overview/);

  for (const [path, re] of [["/insights/prediction", /validated yield model/], ["/insights/fertilizer", /verified source/], ["/insights/market", /verified data provider/]] as const) {
    await page.goto(path);
    await expect(page.getByText(re)).toBeVisible();
    expect(await page.locator("main").innerText()).not.toMatch(/₹|Rs\.? ?\d|\d+ ?kg/);
  }
  await page.goto("/insights/weather");
  await expect(page.getByRole("table")).toBeVisible();

  await page.goto("/more/schemes");
  const hrefs = await page.locator("main a[href^=http]").evaluateAll((as) => as.map((a) => new URL((a as HTMLAnchorElement).href).hostname));
  expect(hrefs.sort()).toEqual(["farmer.gov.in", "pmfby.gov.in", "pmkisan.gov.in", "soilhealth.dac.gov.in"]);
  await expect(page.getByText(/does not reproduce/)).toBeVisible();
});

test("unauthenticated visitors are redirected to login; wrong password shows a generic error", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/overview");
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.getByLabel("Email").fill("farmer@demo.test");
  await page.getByLabel("Password").fill("wrong-password-123");
  await page.getByRole("button", { name: "Sign in" }).last().click();
  await expect(page.getByText("The email or password is not correct.")).toBeVisible();
  await ctx.close();
});

test("language switch to Hindi persists and sets html lang", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "हिं" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  await expect(page.getByRole("link", { name: "फसल मार्गदर्शन पाएँ" }).first()).toBeVisible();
});

test("GPS none-nearby leaves the manual picker usable (Settings farm form)", async ({ browser }) => {
  const ctx = await browser.newContext({ permissions: ["geolocation"], geolocation: { latitude: 1, longitude: 1 } });
  const page = await ctx.newPage();
  await registerAndOnboard(page, "gps2@demo.test");
  await page.goto("/more/settings");
  const farms = page.getByRole("region", { name: "Farms & fields" });
  await farms.getByRole("button", { name: "Add a farm", exact: true }).click();
  await farms.getByRole("button", { name: "Use my current location" }).click();
  await expect(farms.getByTestId("gps-status")).toContainText("No supported district was found");
  await farms.getByLabel("State", { exact: true }).selectOption("DEMO STATE");
  await farms.getByLabel("District", { exact: true }).selectOption("DEMO DISTRICT B");
  await farms.getByLabel("Farm name").fill("Second farm");
  await page.getByRole("button", { name: "Save farm" }).click();
  await expect(page.getByRole("heading", { name: "Second farm" })).toBeVisible();
  await ctx.close();
});

test("GPS permission denied shows a calm message", async ({ browser }) => {
  const ctx = await browser.newContext({ permissions: [] });
  const page = await ctx.newPage();
  await page.goto("/register");
  await page.getByLabel("Email").fill("gps3@demo.test");
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Skip for now" }).click();
  await page.getByRole("button", { name: "Use my current location" }).click();
  await expect(page.getByTestId("gps-status")).toContainText(/permission was not given|could not get your location/);
  await expect(page.getByLabel("State", { exact: true })).toBeEnabled();
  await ctx.close();
});

test("settings: optional soil values live on a field and are described as unused by the guide", async ({ page }) => {
  await registerAndOnboard(page, "soil@demo.test");
  await page.goto("/more/settings");
  await page.getByRole("button", { name: "Soil test values (optional)" }).first().click();
  await expect(page.getByText(/not used by the Regional Crop Guide/).first()).toBeVisible();
  await page.getByLabel("pH", { exact: true }).fill("6.5");
  await page.getByRole("button", { name: "Save soil values" }).click();
  await expect(page.getByText("Soil values saved.")).toBeVisible();
});

test("admin sees the Admin nav and data", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Email").fill("admin@demo.test");
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding/);
  await page.evaluate(() => fetch("/api/v1/profile", { method: "PUT", headers: { "content-type": "application/json", "x-csrf-token": document.cookie.match(/as_csrf=([^;]+)/)![1] }, body: JSON.stringify({ onboardingCompleted: true }) }));
  await page.goto("/admin");
  await expect(page.getByRole("link", { name: "Admin" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Counts" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Data summary" })).toBeVisible();
});
