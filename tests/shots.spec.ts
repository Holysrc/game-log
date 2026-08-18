// @shots — screenshot pass for the critic loop. `npm run shots` writes shots/.
import { mkdir } from "node:fs/promises";
import { test, openApp, openCard, expect } from "./app";
import { makeState, tinyState, State } from "./fixtures";

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
    // keep the whole action panel in the frame
    await page.locator(".card.open .actions").scrollIntoViewIfNeeded();
    await page.screenshot({ path: shot(ti, "03-card-open") });
  });

  test("settings panel", async ({ page }, ti) => {
    await openApp(page, ti, tinyState());
    await page.locator("#gearBtn").click();
    await expect(page.locator("#settingsWin")).toBeVisible();
    await page.screenshot({ path: shot(ti, "04-settings") });
    // spoiler is auto-expanded (no sync configured); open the ⓘ help on top
    await expect(page.locator("#syncBody")).toBeVisible();
    await page.locator("#syncHelpBtn").click();
    await expect(page.locator("#syncHelp")).toBeVisible();
    await page.screenshot({ path: shot(ti, "04b-settings-sync") });
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

  test("results dynamics states", async ({ page }, ti) => {
    // runs row + ▼ drop, growth from zero — the states a critic can't guess
    const st: State = {
      nextId: 6,
      updatedAt: 1754700000000,
      games: [
        { id: 1, name: "Prev One", status: "done", years: [2024], rating: 4 },
        { id: 2, name: "Prev Two", status: "done", years: [2024], rating: 3 },
        { id: 3, name: "Prev Three", status: "done", years: [2024] },
        { id: 4, name: "Curr Replayed", status: "done", years: [2025], counts: { 2025: 2 }, rating: 5, genres: "RPG", platform: "PC", source: "Steam" },
        { id: 5, name: "Old Timer", status: "done", years: [2012], rating: 4 }
      ] as any,
      collapsed: {}
    };
    await openApp(page, ti, st);
    await page.locator("#resultsBtn").click();
    await expect(page.locator("#resultsWin")).toBeVisible();
    // 2025: runs row (×2 replay) + red ▼ drop vs 2024
    await page.screenshot({ path: shot(ti, "07c-results-drop") });
    // 2012: growth from an empty 2011 (0 → 1 ▲)
    await page.locator(".rchip", { hasText: "2012" }).click();
    await page.screenshot({ path: shot(ti, "07d-results-growth") });
    // tinyState 2024: equal years «=»
    await page.locator("#resClose").click();
  });

  test("Sega Genesis theme", async ({ page }, ti) => {
    await openApp(page, ti, makeState(300));
    await page.locator("#gearBtn").click();
    await page.locator("#themeSel").selectOption("genesis");
    await page.locator("#setClose").click(); // settings is a fullscreen window; ✕ closes it
    await page.screenshot({ path: shot(ti, "10-theme-genesis") });
    await page.locator("#resultsBtn").click();
    await expect(page.locator("#resultsWin")).toBeVisible();
    await page.screenshot({ path: shot(ti, "10b-theme-genesis-results") });
  });

  test("results equal-years state", async ({ page }, ti) => {
    await openApp(page, ti, tinyState());
    await page.locator("#resultsBtn").click();
    await expect(page.locator("#resultsWin")).toBeVisible();
    // default period 2024, prev 2023 both have exactly 1 beaten → «=»
    await page.screenshot({ path: shot(ti, "07e-results-equal") });
  });
});
