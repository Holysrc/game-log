import { defineConfig, devices } from "@playwright/test";

// APP_DIR: folder served to the browser. Default is the Vite build output —
// run `npm run build` first (npm pretest does it automatically).
const appDir = process.env.APP_DIR || "dist";
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
    trace: "retain-on-failure",
    // SW would bypass page.route mocks; the offline spec re-enables it
    serviceWorkers: "block",
    // дискретная FF-анимация раскрытия (steps) читается Playwright как
    // «стабильный» элемент между шагами — клики промахиваются; в тестах
    // анимации выключены через prefers-reduced-motion (CSS его уважает)
    contextOptions: { reducedMotion: "reduce" }
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
