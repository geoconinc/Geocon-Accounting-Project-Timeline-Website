import { defineConfig, devices } from "@playwright/test";
import { E2E_BASE_URL, E2E_DATA_DIR, E2E_PORT, E2E_STORAGE_STATE } from "./e2e/constants";

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: 1,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: E2E_BASE_URL,
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: E2E_STORAGE_STATE }
    }
  ],
  webServer: {
    command: "npm run start:e2e",
    url: E2E_BASE_URL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    env: {
      STORAGE_DRIVER: "json",
      DATA_DIR: E2E_DATA_DIR,
      PORT: String(E2E_PORT)
    }
  }
});
