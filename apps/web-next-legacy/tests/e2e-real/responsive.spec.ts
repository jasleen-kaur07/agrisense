import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { registerAndOnboardReal, uniqueEmail } from "./helpers";

test.use({ permissions: ["geolocation"], geolocation: { latitude: 26.85, longitude: 80.95 } });

test("responsive: onboarding, overview and a real result fit the viewport (no horizontal scroll, touch targets, axe)", async ({ page }, info) => {
  const noOverflow = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  await page.goto("/");
  expect(await noOverflow()).toBe(true);
  await registerAndOnboardReal(page, uniqueEmail(info.project.name));
  expect(await noOverflow()).toBe(true);
  await page.goto("/crop-advice");
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page).toHaveURL(/\/result\//, { timeout: 30_000 });
  await expect(page.getByTestId("guide-crops")).toBeVisible();
  expect(await noOverflow()).toBe(true);
  if (info.project.name === "mobile") {
    const menu = page.getByRole("button", { name: "Open menu" });
    await expect(menu).toBeVisible();
    const box = await menu.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({ path: `test-results/real-${info.project.name}-result.png`, fullPage: true });
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
});
