// §9 smoke: tabs/stats, year groups, "+ Beaten in…", stars, notes,
// suggestions, series chip, favorites, sorts, search/#nodata.
import { test, expect, openApp, openCard, meta, toast } from "./app";
import { tinyState } from "./fixtures";

test.describe("tabs & stats", () => {
  test("header stats and status tabs filter cards", async ({ page }, ti) => {
    const { tr } = meta(ti);
    await openApp(page, ti, tinyState());
    await expect(page.locator("#stPlaying")).toHaveText("1");
    await expect(page.locator("#stBacklog")).toHaveText("5");
    await expect(page.locator("#stDone")).toHaveText("5");

    const tabs = page.locator(".tab");
    await expect(tabs).toHaveCount(9); // 8 tabs + conditional «no data» chip
    for (let i = 0; i < 8; i++) await expect(tabs.nth(i)).toHaveText(tr.tabs[i]);

    await tabs.nth(1).click(); // playing
    await expect(page.locator(".card")).toHaveCount(1);
    await expect(page.locator(".card .name")).toHaveText("Alpha Quest");

    await tabs.nth(4).click(); // dropped
    await expect(page.locator(".card")).toHaveCount(1);
    await expect(page.locator(".card .name")).toHaveText("Zeta Zephyr");

    await tabs.nth(6).click(); // catalog: every game exactly once
    await expect(page.locator(".card")).toHaveCount(12);

    await tabs.nth(7).click(); // favorites
    await expect(page.locator(".card")).toHaveCount(1);
    await expect(page.locator(".card .name")).toHaveText("Delta Drift");
  });

  test("status change moves card between sections", async ({ page }, ti) => {
    const { tr } = meta(ti);
    await openApp(page, ti, tinyState());
    const card = await openCard(page, "Beta Blade");
    await card.locator(`button[data-act="status"]`, { hasText: tr.playingLbl }).click();
    await expect(page.locator("#stPlaying")).toHaveText("2");
    const playingSec = page.locator(".sec", { has: page.locator(`.yearhead[data-key="playing"]`) });
    await expect(playingSec.locator(".card", { hasText: "Beta Blade" })).toHaveCount(1);
  });
});

test.describe("year groups", () => {
  test("groups by year desc, «long ago ×N», collapse persists after reload", async ({ page }, ti) => {
    const { tr } = meta(ti);
    await openApp(page, ti, tinyState());
    const heads = page.locator(".yearhead");
    // playing, backlog, 2024, 2023, 2015, 2012, 1998, long-ago, dropped
    await expect(heads).toHaveCount(9);
    await expect(heads.nth(2)).toContainText(`${tr.doneLbl} · 2024`);
    await expect(heads.nth(7)).toContainText(tr.longAgo);
    // ×3 replay badge inside long-ago section
    const agoSec = page.locator(".sec", { has: page.locator(`.yearhead[data-key="y0"]`) });
    await expect(agoSec.locator(".badge")).toContainText("×3");
    // sticky headers
    const pos = await heads.nth(2).evaluate((el) => getComputedStyle(el).position);
    expect(pos).toBe("sticky");

    // collapse backlog section, must survive reload
    const backlogHead = page.locator(`.yearhead[data-key="backlog"]`);
    await backlogHead.click();
    await expect(backlogHead).toHaveClass(/col/);
    const backlogSec = page.locator(".sec", { has: backlogHead });
    await expect(backlogSec.locator(".card")).toHaveCount(0);
    await page.reload();
    await expect(page.locator(`.yearhead[data-key="backlog"]`)).toHaveClass(/col/);
  });

  test("remove year returns game out of the group", async ({ page }, ti) => {
    const { tr } = meta(ti);
    await openApp(page, ti, tinyState());
    const card = page.locator(`.card[data-ctx="0"]`, { hasText: "Epsilon Echo" });
    await card.locator(".name").click();
    await card.locator(`button[data-act="rmyear"]`).click();
    await expect(page.locator(".yearhead", { hasText: tr.longAgo })).toHaveCount(0);
    // still beaten in 2023
    const sec2023 = page.locator(".sec", { has: page.locator(`.yearhead[data-key="y2023"]`) });
    await expect(sec2023.locator(".card", { hasText: "Epsilon Echo" })).toHaveCount(1);
  });
});

test("«+ Beaten in…» select adds a run with count", async ({ page }, ti) => {
  const { tr } = meta(ti);
  await openApp(page, ti, tinyState());
  const cy = new Date().getFullYear();
  const card = await openCard(page, "Beta Blade");
  await card.locator(`[data-role="precount"]`).fill("2");
  await card.locator(`select[data-act="addyearsel"]`).selectOption(String(cy));
  await expect(toast(page)).toContainText(`${tr.addedTo} ${cy} ×2`);
  const sec = page.locator(".sec", { has: page.locator(`.yearhead[data-key="y${cy}"]`) });
  await expect(sec.locator(".card", { hasText: "Beta Blade" }).locator(".badge")).toContainText(
    `${cy} ×2`
  );
  await expect(page.locator("#stDone")).toHaveText("6");
});

test("«+ Beaten in…» works from a year-group card too", async ({ page }, ti) => {
  const { tr } = meta(ti);
  await openApp(page, ti, tinyState());
  const cy = new Date().getFullYear();
  const card = page.locator(`.card[data-ctx="2024"]`, { hasText: "Delta Drift" });
  await card.locator(".name").click();
  await card.locator(`select[data-act="addyearsel"]`).selectOption(String(cy));
  await expect(toast(page)).toContainText(`${tr.addedTo} ${cy}`);
  const sec = page.locator(".sec", { has: page.locator(`.yearhead[data-key="y${cy}"]`) });
  await expect(sec.locator(".card", { hasText: "Delta Drift" })).toHaveCount(1);
  // the 2024 run is untouched
  const sec24 = page.locator(".sec", { has: page.locator(`.yearhead[data-key="y2024"]`) });
  await expect(sec24.locator(".card", { hasText: "Delta Drift" })).toHaveCount(1);
});

test("stars render, community score chip, rating editable", async ({ page }, ti) => {
  await openApp(page, ti, tinyState());
  const delta = page.locator(`.card[data-ctx="2024"]`, { hasText: "Delta Drift" });
  await expect(delta.locator(".cs")).toHaveText("91");
  await expect(delta.locator(".cs")).toHaveClass(/hi/);
  await delta.locator(".name").click();
  await delta.locator(`.rate .star`).nth(4).click();
  const after = page.locator(`.card[data-ctx="2024"]`, { hasText: "Delta Drift" });
  await expect(after.locator(".rate .star.on")).toHaveCount(5);
});

test("note saved and 📝 chip appears", async ({ page }, ti) => {
  await openApp(page, ti, tinyState());
  const card = await openCard(page, "Beta Blade");
  await card.locator("textarea[data-act='note']").fill("test note here");
  await card.locator("textarea[data-act='note']").blur();
  const noteChips = page.locator(`.card`, { hasText: "Beta Blade" }).locator(".plat", { hasText: "📝" });
  await expect(noteChips.first()).toBeVisible();
});

test("custom suggestions work by tap for platform, launcher and series", async ({ page }, ti) => {
  await openApp(page, ti, tinyState());
  await openCard(page, "Gamma Grove");
  // the card must stay open after each suggestion tap
  const card = page.locator(".card.open");
  await card.locator(`input[data-act="plat"]`).focus();
  await card.locator(".sug .sugbtn", { hasText: /^PC$/ }).first().click();
  await expect(card.locator(`input[data-act="plat"]`)).toHaveValue("PC");
  await card.locator(`input[data-act="src"]`).focus();
  await card.locator(".sug .sugbtn", { hasText: /^GOG$/ }).first().click();
  await expect(card.locator(`input[data-act="src"]`)).toHaveValue("GOG");
  await card.locator(`input[data-act="series"]`).focus();
  await card.locator(".sug .sugbtn", { hasText: /^Souls$/ }).first().click();
  await expect(card.locator(`input[data-act="series"]`)).toHaveValue("Souls");
  // chips reflect the picks
  await expect(
    page.locator(".card", { hasText: "Gamma Grove" }).locator(".plat", { hasText: /^PC$/ })
  ).toHaveCount(1);
  await expect(
    page.locator(".card", { hasText: "Gamma Grove" }).locator(".ser", { hasText: /Souls/ })
  ).toHaveCount(1);
});

test("series chip ❖ filters and shows series summary", async ({ page }, ti) => {
  await openApp(page, ti, tinyState());
  const ff = page.locator(".card", { hasText: "Final Fantasy VII" }).first();
  await ff.locator(".ser").click();
  await expect(page.locator("#search")).toHaveValue("Final Fantasy");
  const sum = page.locator(".sersum");
  await expect(sum).toBeVisible();
  await expect(sum).toContainText("Final Fantasy");
  await expect(sum.locator(".n").nth(0)).toHaveText("2"); // games
  await expect(sum.locator(".n").nth(1)).toHaveText("1"); // beaten
});

test("favorite toggles and shows ⚑", async ({ page }, ti) => {
  await openApp(page, ti, tinyState());
  const card = await openCard(page, "Beta Blade");
  await card.locator(`button[data-act="fav"]`).click();
  await expect(
    page.locator(".card", { hasText: "Beta Blade" }).locator(".favmark").first()
  ).toBeVisible();
  await page.locator(".tab").nth(7).click();
  await expect(page.locator(".card")).toHaveCount(2);
});

test("sorts apply and persist", async ({ page }, ti) => {
  await openApp(page, ti, tinyState());
  await page.locator(".tab").nth(6).click(); // catalog
  await page.locator("#sortSel").selectOption("name");
  await expect(page.locator(".card .name").first()).toHaveText("Alpha Quest");
  await page.locator("#sortSel").selectOption("cs");
  await expect(page.locator(".card .name").first()).toHaveText("Final Fantasy VII");
  const stored = await page.evaluate(() => localStorage.getItem("gamelog-sort"));
  expect(stored).toBe("cs");
});

test.describe("search", () => {
  test("prefix search, clear button, #nodata filter", async ({ page }, ti) => {
    await openApp(page, ti, tinyState());
    await page.locator("#search").fill("Skyrim");
    await expect(page.locator(".card")).toHaveCount(2);
    await expect(page.locator("#clearSearch")).toBeVisible();

    await page.locator("#clearSearch").click();
    await expect(page.locator("#search")).toHaveValue("");
    await expect(page.locator(".card .name", { hasText: "Alpha Quest" })).toHaveCount(1);

    await page.locator("#search").fill("#nodata");
    await expect(page.locator(".card")).toHaveCount(1);
    await expect(page.locator(".card .name")).toHaveText("Gamma Grove");
  });

  test("no matches shows empty-search state", async ({ page }, ti) => {
    await openApp(page, ti, tinyState());
    await page.locator("#search").fill("Qqqqqzzz");
    await expect(page.locator(".empty")).toBeVisible();
  });
});

test("empty app shows empty state", async ({ page }, ti) => {
  await openApp(page, ti, null);
  await expect(page.locator(".empty")).toBeVisible();
});

test("«no data» chip shows count, filters on tap, hides when clean", async ({ page }, ti) => {
  await openApp(page, ti, tinyState());
  const chip = page.locator("#nodataChip");
  await expect(chip).toBeVisible(); // Gamma Grove has no source/genres/cs
  await expect(chip).toContainText("1");
  await chip.click();
  await expect(page.locator("#search")).toHaveValue("#nodata");
  await expect(page.locator(".card")).toHaveCount(1);
  await expect(page.locator(".card .name")).toHaveText("Gamma Grove");
  // fill the gap → chip disappears on next render
  await page.evaluate(() => {
    const st = JSON.parse(localStorage.getItem("gamelog-v1")!);
    const g = st.games.find((x: any) => x.name === "Gamma Grove");
    g.source = "Steam";
    g.genres = "RPG";
    localStorage.setItem("gamelog-v1", JSON.stringify(st));
  });
  await page.reload();
  await expect(page.locator("#nodataChip")).toBeHidden();
});
