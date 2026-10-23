import { defineConfig, devices } from "@playwright/test";

/** Runs against the REAL stack (docker compose up): web on :3000 -> gateway -> services. No mocks. */
export default defineConfig({
  testDir: "./tests/e2e-real",
  timeout: 90_000,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: process.env.WEB_URL ?? "http://localhost:3000", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /responsive\.spec\.ts/ },
    { name: "tablet", use: { ...devices["iPad (gen 7)"], browserName: "chromium" }, testMatch: /responsive\.spec\.ts/ },
  ],
});
