import { defineConfig, devices } from "@playwright/test";

// APP_DIR: folder served to the browser (repo root by default, dist/ for build tests)
const appDir = process.env.APP_DIR || ".";
const port = 8123;

export default defineConfig({
  testDir: "tests",
  timeout: 30_000,
  fullyParallel: true,
  retries: 0,
  workers: process.env.CI ? 2 : 4,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${port}/`,
    trace: "retain-on-failure"
  },
  webServer: {
    command: "node tests/server.mjs",
    port,
    reuseExistingServer: true,
    env: { APP_DIR: appDir, PORT: String(port) }
  },
  projects: [
    {
      name: "mobile-ru",
      metadata: { lang: "ru", form: "mobile" },
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } }
    },
    {
      name: "mobile-en",
      metadata: { lang: "en", form: "mobile" },
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } }
    },
    {
      name: "desktop-ru",
      metadata: { lang: "ru", form: "desktop" },
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } }
    },
    {
      name: "desktop-en",
      metadata: { lang: "en", form: "desktop" },
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } }
    }
  ]
});
