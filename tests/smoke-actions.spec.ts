// §9 smoke: dice, duplicate merge (no sequels / same series), CSV import rules,
// JSON backup/restore.
import { readFile } from "node:fs/promises";
import { test, expect, openApp, openCard, meta, toast } from "./app";
import { tinyState } from "./fixtures";

test.describe("dice 🎲", () => {
  test("dicebar on backlog tab picks a backlog game", async ({ page }, ti) => {
    const { tr } = meta(ti);
    await openApp(page, ti, tinyState());
    await page.locator(".tab").nth(2).click(); // backlog
    await page.locator(".dicebar").click();
    await expect(toast(page)).toContainText(tr.dicePick);
    const chosen = page.locator(".card.chosen");
    await expect(chosen).toHaveCount(1);
    await expect(chosen).toHaveClass(/open/);
  });

  test("dice button sits in backlog header on «All»", async ({ page }, ti) => {
    const { tr } = meta(ti);
    await openApp(page, ti, tinyState());
    const diceBtn = page.locator(`.yearhead[data-key="backlog"] .dice`);
    await expect(diceBtn).toBeVisible();
    await diceBtn.click();
    await expect(toast(page)).toContainText(tr.dicePick);
  });
});

test.describe("merge duplicates ⇆", () => {
  test("edition duplicate merges into one game", async ({ page }, ti) => {
    const { tr } = meta(ti);
    await openApp(page, ti, tinyState());
    await page.locator(".tab").nth(5).click(); // catalog: every card in status ctx
    const card = await openCard(page, "Skyrim Special Edition");
    await card.locator(`button[data-act="mergeask"]`).click();
    // keep the plain «Skyrim»
    await card
      .locator(`button[data-act="mergekeep"]`, { hasText: /«?Skyrim»?$/ })
      .last()
      .click();
    await expect(toast(page)).toContainText(tr.merged);
    await expect(page.locator(".card", { hasText: "Skyrim" })).toHaveCount(1);
    const g = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("gamelog-v1")!).games.find(
        (g: any) => g.name === "Skyrim"
      )
    );
    expect(g.years).toEqual([2012]);
    expect(g.time).toBe(360000);
    expect(g.status).toBe("done");
  });

  test("sequels and same-series games are not offered as duplicates", async ({ page }, ti) => {
    await openApp(page, ti, tinyState());
    await page.locator(".tab").nth(5).click();
    const ds = await openCard(page, "Dark Souls 2");
    await expect(ds.locator(`button[data-act="mergeask"]`)).toHaveCount(0);
    await ds.locator(".name").click(); // close
    const ff = await openCard(page, "Final Fantasy VIII");
    await expect(ff.locator(`button[data-act="mergeask"]`)).toHaveCount(0);
  });

  test("«not duplicates» hides the pair and can be reset", async ({ page }, ti) => {
    await openApp(page, ti, tinyState());
    await page.locator(".tab").nth(5).click();
    const card = await openCard(page, "Skyrim Special Edition");
    await card.locator(`button[data-act="nomerge"]`).click();
    // card stays open after the ✕ — suggestion must be gone
    const reopened = page.locator(".card.open");
    await expect(reopened.locator(`button[data-act="mergeask"]`)).toHaveCount(0);
    // reset in settings brings the suggestion back
    await page.locator("#gearBtn").click();
    const resetBtn = page.locator("#resetNoMergeBtn");
    await expect(resetBtn).toBeVisible();
    await expect(resetBtn).toContainText("(1)");
    await resetBtn.click();
    await page.locator("#gearBtn").click();
    const again = page.locator(".card.open");
    await expect(again.locator(`button[data-act="mergeask"]`)).toHaveCount(1);
  });
});

test("CSV import follows §3 overwrite rules", async ({ page }, ti) => {
  const { tr } = meta(ti);
  await openApp(page, ti, tinyState());
  const csv = [
    "Name,Completion Status,Platform,Source,Genres,Release Date,Time Played,Community Score,Series,Favorite,User Score",
    '"Beta Blade","Beaten","Sony PlayStation 5","Steam","Action, RPG, Puzzle","2018-03-01",5000,70,"BetaSeries",TRUE,',
    '"Gamma Grove","Not Played","PC (Windows)","GOG","Puzzle, Horror","2010-05-05",100,50,"",FALSE,',
    '"Delta Drift","Abandoned","PC","Epic","Racing","2015-01-01",1000,77,"",FALSE,60',
    '"Omega Order","Plan to Play","PC","Steam","Strategy","2022-02-02",0,80,"",FALSE,'
  ].join("\n");
  await page.setInputFiles("#csvFile", {
    name: "playnite.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv, "utf-8")
  });
  await expect(toast(page)).toContainText(`${tr.impDone} 1`);

  const games = await page.evaluate(
    () => JSON.parse(localStorage.getItem("gamelog-v1")!).games
  );
  const byName = (n: string) => games.find((g: any) => g.name === n);

  const beta = byName("Beta Blade");
  expect(beta.status).toBe("done"); // upgraded from backlog
  expect(beta.years).toEqual([0]); // unknown year → «long ago»
  expect(beta.platform).toBe("PS5"); // manual data never overwritten
  expect(beta.source).toBe("Диск"); // real launcher kept
  expect(beta.genres).toBe("Action"); // kept
  expect(beta.time).toBe(5000); // time only grows
  expect(beta.cs).toBe(70); // cs always refreshed
  expect(beta.series).toBe("BetaSeries"); // series always from Playnite
  expect(beta.fav).toBe(true);

  const gamma = byName("Gamma Grove");
  expect(gamma.platform).toBe("PC"); // cleaned "(Windows)"
  expect(gamma.source).toBe("GOG");
  expect(gamma.genres).toBe("Puzzle, Horror");
  expect(gamma.rel).toBe(2010);
  expect(gamma.time).toBe(100);

  const delta = byName("Delta Drift");
  expect(delta.status).toBe("done"); // done never downgraded
  expect(delta.rating).toBe(4); // own rating kept
  expect(delta.time).toBe(36000); // bigger local time kept
  expect(delta.cs).toBe(77);

  expect(byName("Omega Order").status).toBe("backlog");
});

test.describe("backup / restore", () => {
  test("backup downloads full JSON", async ({ page }, ti) => {
    await openApp(page, ti, tinyState());
    await page.locator("#gearBtn").click();
    const dl = page.waitForEvent("download");
    await page.locator("#bakBtn").click();
    const download = await dl;
    const content = JSON.parse(await readFile((await download.path())!, "utf-8"));
    expect(content.games).toHaveLength(12);
    expect(content.nextId).toBe(13);
  });

  test("restore replaces state from JSON file", async ({ page }, ti) => {
    const { tr } = meta(ti);
    await openApp(page, ti, tinyState());
    const restored = {
      nextId: 3,
      updatedAt: 1754700000001,
      games: [
        { id: 1, name: "Restored One", status: "playing", years: [] },
        { id: 2, name: "Restored Two", status: "done", years: [2020] }
      ],
      collapsed: {}
    };
    await page.setInputFiles("#jsonFile", {
      name: "game-log.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(restored), "utf-8")
    });
    await expect(toast(page)).toContainText(tr.restored);
    await expect(page.locator("#stPlaying")).toHaveText("1");
    await expect(page.locator("#stBacklog")).toHaveText("0");
    await expect(page.locator("#stDone")).toHaveText("1");
    await expect(page.locator(".card", { hasText: "Restored One" }).first()).toBeVisible();
  });
});
