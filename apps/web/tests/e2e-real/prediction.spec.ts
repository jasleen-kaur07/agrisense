import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { registerAndOnboardReal, uniqueEmail } from "./helpers";

test("crop prediction (form validation, model result, a11y)", async ({ page }) => {
  await registerAndOnboardReal(page, uniqueEmail("predict"), { gps: false });
  await page.goto("/insights/prediction");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Soil-test crop prediction");

  // all seven values are required: nothing is imputed
  await page.getByRole("button", { name: "Show prediction" }).click();
  await expect(page.getByText("Enter a value.")).toHaveCount(7);
  await page.getByLabel("Soil pH").fill("12");
  await page.getByRole("button", { name: "Show prediction" }).click();
  await expect(page.getByText(/Must be between 3\.5 and 9\.9/)).toBeVisible();

  const values: Record<string, string> = {
    "Nitrogen (N)": "90", "Phosphorus (P)": "42", "Potassium (K)": "43",
    "Temperature (°C)": "20.9", "Humidity (%)": "82", "Soil pH": "6.5", "Rainfall (mm)": "203",
  };
  for (const [label, v] of Object.entries(values)) await page.getByLabel(label).fill(v);
  await page.getByRole("button", { name: "Show prediction" }).click();

  const result = page.getByTestId("prediction-result");
  await expect(result).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("prediction-item")).toHaveCount(3);
  await expect(page.getByTestId("prediction-item").first()).toContainText("Rice");
  await expect(result).toContainText("Experimental");
  expect(await result.innerText()).not.toMatch(/\d+\s?%|best crop|guarantee/i);

  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
});

test("REAL STACK: district search box accepts typing and picks a district", async ({ page }) => {
  await registerAndOnboardReal(page, uniqueEmail("search"), { gps: false });
  await page.goto("/more/settings");
  const box = page.getByLabel("Search for a district");
  await box.click();
  await page.keyboard.type("luck", { delay: 60 });
  await expect(box).toHaveValue("luck");
  await page.getByRole("button", { name: "Lucknow, Uttar Pradesh" }).click();
  await expect(page.getByLabel("State", { exact: true })).toHaveValue("UTTAR PRADESH");
  await expect(page.getByLabel("District", { exact: true })).toHaveValue("LUCKNOW");
});
