// @shots — screenshot pass for the critic loop. `npm run shots` writes shots/.
import { mkdir } from "node:fs/promises";
import { test, openApp, openCard, expect } from "./app";
import { makeState, tinyState } from "./fixtures";

const DIR = "shots";

test.describe("@shots key screens", () => {
  test.beforeAll(async () => {
    await mkdir(DIR, { recursive: true });
  });

  const shot = (ti: any, name: string) => `${DIR}/${ti.project.name}-${name}.png`;

  test("main list", async ({ page }, ti) => {
    await openApp(page, ti, makeState(300));
    await page.screenshot({ path: shot(ti, "01-main"), fullPage: false });
  });

  test("backlog with dicebar", async ({ page }, ti) => {
    await openApp(page, ti, makeState(300));
    await page.locator(".tab").nth(2).click();
    await page.screenshot({ path: shot(ti, "02-backlog") });
  });

  test("open card actions", async ({ page }, ti) => {
    await openApp(page, ti, tinyState());
    await openCard(page, "Skyrim Special Edition");
    await page.screenshot({ path: shot(ti, "03-card-open") });
  });

  test("settings panel", async ({ page }, ti) => {
    await openApp(page, ti, tinyState());
    await page.locator("#gearBtn").click();
    await expect(page.locator("#syncPanel")).toBeVisible();
    await page.screenshot({ path: shot(ti, "04-settings") });
  });

  test("series search summary", async ({ page }, ti) => {
    await openApp(page, ti, tinyState());
    await page.locator("#search").fill("Final Fantasy");
    await expect(page.locator(".sersum")).toBeVisible();
    await page.screenshot({ path: shot(ti, "05-series") });
  });

  test("empty state", async ({ page }, ti) => {
    await openApp(page, ti, null);
    await page.screenshot({ path: shot(ti, "06-empty") });
  });
});
