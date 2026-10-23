import { expect, type Page } from "@playwright/test";

export const PASSWORD = "Correct-horse-battery-9";
export const uniqueEmail = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@example.com`;

/** Register + onboarding with GPS pointing at Lucknow. Soil is never entered. */
/** Each simulated visitor gets its own client IP (the web proxy trusts X-Forwarded-For in the local stack),
 *  so the real per-IP rate limiters do not throttle a test run that registers many users from one machine. */
export async function asOwnVisitor(page: Page) {
  const r = () => Math.floor(Math.random() * 250) + 1;
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `10.${r()}.${r()}.${r()}` });
}

export async function registerAndOnboardReal(page: Page, email: string, opts: { gps?: boolean } = { gps: true }) {
  await asOwnVisitor(page);
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByLabel("Your name").fill("Asha Devi");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Some experience").check();
  await page.getByRole("button", { name: "Continue" }).click();
  if (opts.gps) {
    await page.getByRole("button", { name: "Use my current location" }).click();
    await expect(page.getByTestId("gps-status")).toContainText("Lucknow", { timeout: 15_000 });
  } else {
    await page.getByLabel("State", { exact: true }).selectOption("UTTAR PRADESH");
    await expect(page.getByLabel("District", { exact: true })).toBeEnabled();
    await page.getByLabel("District", { exact: true }).selectOption("LUCKNOW");
  }
  await expect(page.getByLabel("District", { exact: true })).toHaveValue("LUCKNOW");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Field name").fill("North plot");
  await page.getByLabel("Area (acres)").fill("2.5");
  await page.getByRole("button", { name: "Finish setup" }).click();
  await expect(page).toHaveURL(/\/overview/, { timeout: 20_000 });
}
