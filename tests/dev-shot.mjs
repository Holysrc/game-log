// Dev-only: quick design screenshots against the built dist/ (server on :8123).
// Usage: node tests/dev-shot.mjs  → writes shots-dev/*.png
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const games = [];
let id = 1;
const mk = (o) => games.push(Object.assign({ id: id++, years: [], platform: null, rating: null }, o));
mk({ name: "Final Fantasy Type-0 HD", status: "playing", platform: "PS4", source: "PSN", genres: "JRPG, Экшен", rel: 2015, time: 41 * 3600, cs: 74, series: "Final Fantasy", note: "Перепрохожу ради второй концовки." });
mk({ name: "Bridge Constructor: The Walking Dead", status: "playing", platform: "PC", source: "Epic", genres: "Головоломка, Инди", rel: 2020, time: 6 * 3600, cs: 61 });
mk({ name: "100% Orange Juice", status: "backlog", platform: "PC", source: "Steam", genres: "Party, Карточная", rel: 2014, cs: 82 });
mk({ name: "112 Operator", status: "backlog", platform: "PC", source: "Steam", genres: "Симулятор", rel: 2020, cs: 71 });
mk({ name: "A Hat in Time", status: "backlog", platform: "PC", source: "Steam", genres: "Платформер", rel: 2017, cs: 88, fav: true });
mk({ name: "Alien: Isolation", status: "backlog", platform: "PC", source: "Epic", genres: "Хоррор, Стелс", rel: 2014, cs: 81, note: "Собраться с духом и начать." });
mk({ name: "Baba Is You", status: "backlog", platform: "PC", source: "Steam", genres: "Головоломка", rel: 2019, cs: 87 });
mk({ name: "Chained Echoes", status: "onhold", platform: "Steam Deck", source: "Steam", genres: "JRPG", rel: 2022, cs: 89, note: "Вернусь после отпуска" });
mk({ name: "Anthem", status: "dropped", platform: "PC", source: "EA app", genres: "Шутер", rel: 2019, cs: 55, rating: 2 });
mk({ name: "Batman: Arkham Asylum", status: "done", years: [2021], platform: "PC", source: "Steam", genres: "Экшен", rel: 2009, time: 17 * 3600, rating: 4, cs: 90, series: "Batman Arkham" });
mk({ name: "Batman: Arkham City", status: "done", years: [2021, 0], counts: { 0: 2 }, platform: "PC", source: "Steam", genres: "Экшен", rel: 2011, time: 29 * 3600, rating: 5, cs: 91, series: "Batman Arkham", fav: true });
mk({ name: "BioShock Infinite", status: "done", years: [2023], platform: "PC", source: "Steam", genres: "Шутер", rel: 2013, time: 14 * 3600, rating: 5, cs: 88 });
mk({ name: "Celeste", status: "done", years: [2023], platform: "PC", source: "Steam", genres: "Платформер", rel: 2018, time: 33 * 3600, rating: 5, cs: 92, note: "Все B-Side пройдены.", fav: true });
mk({ name: "Hollow Knight", status: "done", years: [2024], platform: "Switch", source: "Эмулятор", genres: "Метроидвания", rel: 2017, time: 52 * 3600, rating: 5, cs: 93, series: "Hollow Knight" });
mk({ name: "Dark Souls", status: "done", years: [0], counts: { 0: 3 }, platform: "PC", source: "Steam", genres: "Экшен-RPG", rel: 2011, time: 120 * 3600, rating: 5, cs: 89, series: "Dark Souls" });
mk({ name: "Dark Souls II", status: "done", years: [2024], platform: "PC", source: "Steam", genres: "Экшен-RPG", rel: 2014, time: 80 * 3600, rating: 4, cs: 80, series: "Dark Souls" });
mk({ name: "Dark Souls III", status: "backlog", platform: "PC", source: "Steam", genres: "Экшен-RPG", rel: 2016, cs: 89, series: "Dark Souls" });
mk({ name: "Elden Ring", status: "done", years: [2022, 2024], platform: "PC", source: "Steam", genres: "Экшен-RPG", rel: 2022, time: 140 * 3600, rating: 5, cs: 94 });
const seed = JSON.stringify({ nextId: id, updatedAt: 1700000000000, games, collapsed: {} });

mkdirSync("shots-dev", { recursive: true });
const browser = await chromium.launch();

async function open(vp, extra) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.addInitScript(([s, ex]) => {
    localStorage.setItem("gamelog-v1", s);
    localStorage.setItem("gamelog-lang", "ru");
    for (const [k, v] of Object.entries(ex || {})) localStorage.setItem(k, v);
  }, [seed, extra || {}]);
  await page.goto("http://localhost:8123/dist/");
  await page.waitForTimeout(500);
  return { ctx, page };
}

const M = { width: 390, height: 844 }, D = { width: 1280, height: 800 };

{ // mobile home (list view)
  const { ctx, page } = await open(M);
  await page.screenshot({ path: "shots-dev/m-home-top.png" });
  await page.screenshot({ path: "shots-dev/m-home-full.png", fullPage: true });
  // open a backlog row (view mode)
  await page.locator('.rowv[data-id="5"] .cmain').click();
  await page.waitForTimeout(300);
  await page.locator('.card[data-id="5"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: "shots-dev/m-row-view.png" });
  // edit mode
  await page.locator('[data-act="edit"]').click();
  await page.waitForTimeout(300);
  await page.locator('.card[data-id="5"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: "shots-dev/m-row-edit.png", fullPage: false });
  await ctx.close();
}
{ // mobile: playing tile open + year-group row
  const { ctx, page } = await open(M);
  await page.locator('.tile[data-id="1"] .cmain').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "shots-dev/m-tile-view.png" });
  const yr = page.locator('.card[data-ctx="2021"][data-id="10"]');
  await yr.locator(".cmain").click();
  await page.waitForTimeout(300);
  await yr.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "shots-dev/m-year-view.png" });
  await ctx.close();
}
{ // mobile cards view
  const { ctx, page } = await open(M, { "gamelog-view": "cards" });
  await page.screenshot({ path: "shots-dev/m-cards.png", fullPage: true });
  await ctx.close();
}
{ // mobile genesis theme
  const { ctx, page } = await open(M, { "gamelog-theme": "genesis" });
  await page.screenshot({ path: "shots-dev/m-genesis.png" });
  await ctx.close();
}
{ // desktop
  const { ctx, page } = await open(D);
  await page.screenshot({ path: "shots-dev/d-home.png" });
  await page.locator('.rowv[data-id="5"] .cmain').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "shots-dev/d-row-view.png" });
  await page.locator('[data-act="edit"]').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "shots-dev/d-row-edit.png" });
  await ctx.close();
}
await browser.close();
console.log("done → shots-dev/");
