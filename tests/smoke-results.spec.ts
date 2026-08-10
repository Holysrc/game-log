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

test("year metrics: beaten, rating, GOTY, dynamics — but never hours", async ({ page }, ti) => {
  const { tr } = meta(ti);
  await openApp(page, ti, tinyState());
  await openResults(page);
  // 2024: only Delta Drift (★4, Racing, Switch, Steam)
  const body = page.locator("#resBody");
  await expect(body.locator(".rrow", { hasText: tr.resBeaten }).locator(".rval")).toHaveText("1");
  // Playnite time is a lifetime total → year views must not show hours at all
  await expect(body.locator(".rrow", { hasText: tr.resHours })).toHaveCount(0);
  await expect(body.locator(".rrow", { hasText: tr.resLongest })).toHaveCount(0);
  await expect(body.locator(".rrow", { hasText: tr.resGoty })).toContainText("Delta Drift");
  // year-over-year: 2023 also had 1 beaten → equal
  const vs = body.locator(".rrow", { hasText: `${tr.resVsPrev} (2023)` });
  await expect(vs).toContainText("1 → 1");
  await expect(vs.locator(".same")).toBeVisible();
  // dynamics chart: 5 real years, selected one highlighted
  await expect(body.locator(".rchart .rcol")).toHaveCount(5);
  await expect(body.locator(".rcol.sel")).toHaveAttribute("data-year", "2024");
  // breakdowns by genre / platform / launcher
  await expect(body.locator(".rbar", { hasText: "Racing" })).toBeVisible();
  await expect(body.locator(".rbar", { hasText: "Switch" })).toBeVisible();
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
  // all-time is the only place where lifetime hours are legitimate
  await expect(body.locator(".rrow", { hasText: tr.resHours })).toHaveCount(1);
  await expect(body.locator(".rrow", { hasText: tr.resLongest })).toContainText("Skyrim");
  // chart present, no year highlighted
  await expect(body.locator(".rchart .rcol")).toHaveCount(5);
  await expect(body.locator(".rcol.sel")).toHaveCount(0);
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

test("year with replays shows runs row; drop vs last year shows ▼", async ({ page }, ti) => {
  const { tr } = meta(ti);
  const st: State = {
    nextId: 6,
    updatedAt: 1754700000000,
    games: [
      { id: 1, name: "Prev One", status: "done", years: [2024] },
      { id: 2, name: "Prev Two", status: "done", years: [2024] },
      { id: 3, name: "Prev Three", status: "done", years: [2024] },
      { id: 4, name: "Curr Replayed", status: "done", years: [2025], counts: { 2025: 2 } },
      { id: 5, name: "Old Timer", status: "done", years: [2012] }
    ] as any,
    collapsed: {}
  };
  await openApp(page, ti, st);
  await openResults(page);
  const body = page.locator("#resBody");
  // 2025 selected by default (latest year, current has none): 1 beaten, 2 runs
  await expect(body.locator(".rrow", { hasText: tr.resBeaten }).locator(".rval")).toHaveText("1");
  await expect(body.locator(".rrow", { hasText: tr.resRuns }).locator(".rval")).toHaveText("2");
  // drop vs 2024: 3 → 1
  const vs = body.locator(".rrow", { hasText: `${tr.resVsPrev} (2024)` });
  await expect(vs).toContainText("3 → 1");
  await expect(vs.locator(".down")).toBeVisible();
  // growth from an empty previous year: 2012 vs 2011
  await page.locator(".rchip", { hasText: "2012" }).click();
  const vs2 = body.locator(".rrow", { hasText: `${tr.resVsPrev} (2011)` });
  await expect(vs2).toContainText("0 → 1");
  await expect(vs2.locator(".up")).toBeVisible();
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
