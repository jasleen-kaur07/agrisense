import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const [name, width, height] of [["mobile", 390, 844], ["tablet", 820, 1180], ["desktop", 1440, 900]] as const) {
  test(`landing page (${name}): no horizontal scroll, axe clean, honest content, Hindi switch`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("See what has grown in your district");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await expect(page.getByText("Experimental").first()).toBeVisible();
    const text = await page.locator("main").innerText();
    expect(text).not.toMatch(/best crop|₹|yield of/i);
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
    await page.locator('button[lang="hi"]').first().click();
    await expect(page.locator("html")).toHaveAttribute("lang", "hi");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
}
