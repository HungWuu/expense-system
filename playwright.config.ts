import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  webServer: {
    command: "npx next dev -p 3001",
    port: 3001,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: {
      E2E_TEST: "true",
      NEXTAUTH_URL: "http://localhost:3001",
      NEXTAUTH_SECRET: "e2e-test-secret-key-for-nextauth",
    },
  },
});
