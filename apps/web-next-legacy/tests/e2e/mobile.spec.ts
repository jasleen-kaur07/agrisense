import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { registerAndOnboard, resetMock } from "./helpers";

test.beforeAll(resetMock);

test("mobile viewport: menu collapses, no horizontal scroll, touch targets, axe", async ({ page }) => {
  await page.goto("/");
  const noOverflow = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  expect(await noOverflow()).toBe(true);

  await registerAndOnboard(page, "mobile@demo.test");
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeHidden();
  const menu = page.getByRole("button", { name: "Open menu" });
  await expect(menu).toBeVisible();
  const box = await menu.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
  await menu.click();
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await expect(nav.getByRole("link", { name: "Weather" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Government Schemes" })).toBeVisible();
  await nav.getByRole("link", { name: "Crop Advice" }).click();
  await expect(page).toHaveURL(/\/crop-advice/);
  expect(await noOverflow()).toBe(true);

  await page.getByRole("button", { name: "Start" }).click();
  await expect(page).toHaveURL(/\/result\//, { timeout: 20_000 });
  await expect(page.getByTestId("guide-crops")).toBeVisible();
  expect(await noOverflow()).toBe(true);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
});
