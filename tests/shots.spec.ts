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

  test("dice window", async ({ page }, ti) => {
    await openApp(page, ti, makeState(300));
    await page.locator(".tab").nth(2).click();
    await page.locator(".dicebar").click();
    await expect(page.locator("#diceWin")).toBeVisible();
    await page.screenshot({ path: shot(ti, "09-dice") });
  });

  test("results screen", async ({ page }, ti) => {
    await openApp(page, ti, makeState(300));
    await page.locator("#resultsBtn").click();
    await expect(page.locator("#resultsWin")).toBeVisible();
    await page.screenshot({ path: shot(ti, "07-results") });
    // all-time has the fullest layout
    await page.locator(".rchip").first().click();
    await page.screenshot({ path: shot(ti, "08-results-alltime") });
    // launcher CSS bars are the flagship element — capture them explicitly
    await page.locator(".rbar").last().scrollIntoViewIfNeeded();
    await page.screenshot({ path: shot(ti, "08b-results-launchers") });
  });
});
