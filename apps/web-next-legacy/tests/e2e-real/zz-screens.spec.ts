import { test } from "@playwright/test";
import { registerAndOnboardReal, uniqueEmail } from "./helpers";

test.skip(process.env.SCREENSHOTS !== "1", "manual: set SCREENSHOTS=1 to capture screenshots into test-results/");
test.use({ permissions: ["geolocation"], geolocation: { latitude: 26.85, longitude: 80.95 }, viewport: { width: 1280, height: 900 } });

test("capture screens", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: "test-results/shot-landing.png", fullPage: true });
  await registerAndOnboardReal(page, uniqueEmail("shot"));
  await page.screenshot({ path: "test-results/shot-overview.png", fullPage: true });
  await page.goto("/crop-advice");
  await page.getByRole("button", { name: "Start" }).click();
  await page.waitForURL(/result/);
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/shot-result.png", fullPage: true });
});
