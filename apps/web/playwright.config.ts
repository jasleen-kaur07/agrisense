import { defineConfig, devices } from "@playwright/test";

const WEB_PORT = 3100;
const MOCK_PORT = 8090;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /mobile\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: [
    {
      command: "node tests/mock-api/server.mjs",
      url: `http://127.0.0.1:${MOCK_PORT}/health`,
      env: { MOCK_PORT: String(MOCK_PORT) },
      reuseExistingServer: false,
    },
    {
      // Requires `npm run build` first (the e2e npm script does it).
      command: `npx next start -p ${WEB_PORT} -H 127.0.0.1`,
      url: `http://127.0.0.1:${WEB_PORT}/`,
      env: { GATEWAY_URL: `http://127.0.0.1:${MOCK_PORT}` },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
