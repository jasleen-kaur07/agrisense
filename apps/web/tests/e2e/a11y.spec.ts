import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { registerAndOnboard, resetMock } from "./helpers";

test.beforeAll(resetMock);

async function scan(page: Page, name: string) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const summary = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ") + " :: " + n.html.slice(0, 160)).join(" | ")}`);
  expect(summary, `axe violations on ${name}`).toEqual([]);
}

test("axe smoke on public and key app pages", async ({ page }) => {
  for (const p of ["/", "/how-it-works", "/login", "/register"]) {
    await page.goto(p);
    await page.waitForLoadState("networkidle");
    await scan(page, p);
  }
  await registerAndOnboard(page, "a11y@demo.test");
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("weather-status").first()).toBeVisible();
  await scan(page, "/overview");

  await page.goto("/crop-advice");
  await expect(page.getByRole("button", { name: "Start" })).toBeVisible();
  await scan(page, "/crop-advice");

  await page.getByRole("button", { name: "Start" }).click();
  await expect(page).toHaveURL(/\/result\//, { timeout: 20_000 });
  await expect(page.getByTestId("guide-crops")).toBeVisible();
  await scan(page, "result");

  for (const p of ["/insights/weather", "/insights/market", "/more/schemes", "/more/settings", "/more/history"]) {
    await page.goto(p);
    await page.waitForLoadState("networkidle");
    await scan(page, p);
  }
});
