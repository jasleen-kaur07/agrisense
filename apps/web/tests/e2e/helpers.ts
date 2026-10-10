import { expect, type Page } from "@playwright/test";

export const MOCK = "http://127.0.0.1:8090";

export async function resetMock() {
  const r = await fetch(`${MOCK}/__reset`, { method: "POST" });
  expect(r.ok).toBe(true);
}

export async function registerAndOnboard(page: Page, email: string, opts: { gps?: boolean } = {}) {
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding/);

  await page.getByLabel("Your name").fill("Demo Farmer");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Some experience").check();
  await page.getByRole("button", { name: "Continue" }).click();

  if (opts.gps) {
    await page.getByRole("button", { name: "Use my current location" }).click();
    await expect(page.getByTestId("gps-status")).toContainText("Demo District A");
    await expect(page.getByTestId("gps-status")).toContainText("12");
  } else {
    await page.getByLabel("State", { exact: true }).selectOption("DEMO STATE");
    await expect(page.getByLabel("District", { exact: true })).toBeEnabled();
    await page.getByLabel("District", { exact: true }).selectOption("DEMO DISTRICT A");
  }
  await expect(page.getByLabel("District", { exact: true })).toHaveValue("DEMO DISTRICT A");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Field name").fill("North plot");
  await page.getByLabel("Area (acres)").fill("2.5");
  await page.getByRole("button", { name: "Finish setup" }).click();
  await expect(page).toHaveURL(/\/overview/);
}
