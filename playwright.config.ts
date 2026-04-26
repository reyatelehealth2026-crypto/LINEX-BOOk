import { defineConfig, devices } from "@playwright/test";

const ROOT = process.env.E2E_ROOT_URL || "https://xn--42cfc0k1a8b.net";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: ROOT,
    trace: "on-first-retry",
    ignoreHTTPSErrors: true,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
