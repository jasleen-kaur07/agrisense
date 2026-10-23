import { expect, test } from "@playwright/test";
import { registerAndOnboardReal, uniqueEmail } from "./helpers";

// Run only when the stack's data-service was started with an unreachable provider and an empty weather cache:
//   EXPECT_WEATHER=unavailable npx playwright test -c playwright.real.config.ts weather-unavailable
test.skip(process.env.EXPECT_WEATHER !== "unavailable", "needs the stack started with a broken Open-Meteo URL");
test.use({ permissions: ["geolocation"], geolocation: { latitude: 26.85, longitude: 80.95 } });

test("weather UNAVAILABLE is shown honestly: no numbers, calm message, guide still works", async ({ page }) => {
  await registerAndOnboardReal(page, uniqueEmail("wx"));
  await expect(page.getByTestId("weather-status").first()).toHaveText("Unavailable");
  const weatherBlock = page.getByTestId("weather-status").first().locator("xpath=ancestor::section[1]");
  expect(await weatherBlock.innerText()).not.toMatch(/\d+\s?°/);
  await page.goto("/insights/weather");
  await expect(page.getByTestId("weather-status").first()).toHaveText("Unavailable");
  await expect(page.getByText(/temporarily unavailable/i).first()).toBeVisible();
  await page.goto("/crop-advice");
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page).toHaveURL(/\/result\//, { timeout: 30_000 });
  await expect(page.getByTestId("guide-crops")).toBeVisible();
  await expect(page.getByTestId("weather-status")).toHaveText("Unavailable");
});
