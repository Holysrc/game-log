// Stage 2: «Итоги» — fullscreen results screen.
import { test, expect, openApp, meta, expectNoHorizontalOverflow } from "./app";
import { tinyState, State } from "./fixtures";

async function openResults(page: any) {
  await page.locator("#resultsBtn").click();
  await expect(page.locator("#resultsWin")).toBeVisible();
}

test("opens from header, shows period chips for every year with runs", async ({ page }, ti) => {
  const { tr } = meta(ti);
  await openApp(page, ti, tinyState());
  await openResults(page);
  await expect(page.locator("#resTitle")).toHaveText(tr.resTitle);
  const chips = page.locator(".rchip");
  // Всё время + 2024, 2023, 2015, 2012, 1998 + Давно
  await expect(chips).toHaveCount(7);
  await expect(chips.nth(0)).toHaveText(tr.resAll);
  await expect(chips.nth(1)).toHaveText("2024");
  await expect(chips.nth(6)).toHaveText(tr.longAgo);
  // default period = latest year with runs (2024 — current year has none)
  await expect(chips.nth(1)).toHaveClass(/active/);
});

test("year metrics: beaten, hours, rating, game of the year", async ({ page }, ti) => {
  const { tr } = meta(ti);
  await openApp(page, ti, tinyState());
  await openResults(page);
  // 2024: only Delta Drift (10h, ★4, Racing, Switch, Steam)
  const body = page.locator("#resBody");
  await expect(body.locator(".rrow", { hasText: tr.resBeaten }).locator(".rval")).toHaveText("1");
  // Playnite time is a lifetime total → the year view must say so
  await expect(body.locator(".rrow", { hasText: tr.resHoursTotal })).toHaveCount(1);
  await expect(body.locator(".rrow", { hasText: tr.resGoty })).toContainText("Delta Drift");
  await expect(body.locator(".rrow", { hasText: tr.resLongest })).toContainText("Delta Drift");
  await expect(body.locator(".rbar", { hasText: "Steam" })).toBeVisible();
});

test("«all time» aggregates runs, picks longest-by-hours on rating tie", async ({ page }, ti) => {
  const { tr } = meta(ti);
  await openApp(page, ti, tinyState());
  await openResults(page);
  await page.locator(".rchip", { hasText: tr.resAll }).click();
  const body = page.locator("#resBody");
  await expect(body.locator(".rrow", { hasText: tr.resBeaten }).locator(".rval")).toHaveText("5");
  // total runs 8 (Epsilon: Давно ×3 + 2023)
  await expect(body.locator(".rrow", { hasText: tr.resRuns }).locator(".rval")).toHaveText("8");
  // all-time keeps the plain hours label
  await expect(body.locator(".rrow", { hasText: tr.resHoursTotal })).toHaveCount(0);
  await expect(body.locator(".rrow", { hasText: tr.resHours })).toHaveCount(1);
  // rating tie 5★ → Skyrim wins by 100h
  await expect(body.locator(".rrow.wide").first()).toContainText("Skyrim");
  await expect(body.locator(".rrow", { hasText: tr.resSeriesAll })).toContainText("Final Fantasy");
});

test("«long ago» period counts replays", async ({ page }, ti) => {
  const { tr } = meta(ti);
  await openApp(page, ti, tinyState());
  await openResults(page);
  await page.locator(".rchip", { hasText: tr.longAgo }).click();
  const body = page.locator("#resBody");
  await expect(body.locator(".rrow", { hasText: tr.resBeaten }).locator(".rval")).toHaveText("1");
  await expect(body.locator(".rrow", { hasText: tr.resRuns }).locator(".rval")).toHaveText("3");
  await expect(body.locator(".rrow", { hasText: tr.resGoty })).toContainText("Epsilon Echo");
});

test("empty state when there are no completions at all", async ({ page }, ti) => {
  const { tr } = meta(ti);
  const st: State = {
    nextId: 3,
    updatedAt: 1754700000000,
    games: [
      { id: 1, name: "Only Backlog", status: "backlog", years: [] },
      { id: 2, name: "Only Playing", status: "playing", years: [] }
    ] as any,
    collapsed: {}
  };
  await openApp(page, ti, st);
  await openResults(page);
  await expect(page.locator(".rchip")).toHaveCount(1); // only «all time»
  await expect(page.locator(".rempty")).toHaveText(tr.resEmpty);
});

test("closes by ✕ and by Escape", async ({ page }, ti) => {
  await openApp(page, ti, tinyState());
  await openResults(page);
  await page.locator("#resClose").click();
  await expect(page.locator("#resultsWin")).toBeHidden();
  await openResults(page);
  await page.keyboard.press("Escape");
  await expect(page.locator("#resultsWin")).toBeHidden();
});

test("mobile: results screen has no horizontal overflow", async ({ page }, ti) => {
  test.skip(meta(ti).form !== "mobile", "mobile-only check");
  await openApp(page, ti, tinyState());
  await openResults(page);
  await expectNoHorizontalOverflow(page);
});
