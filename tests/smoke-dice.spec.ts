// Stage 3: smart dice — filter window over the backlog pool.
import { test, expect, openApp, meta, toast } from "./app";
import { tinyState } from "./fixtures";

// tinyState backlog (5): Beta Blade (Action, cs62), Gamma Grove (no data),
// Final Fantasy VIII (JRPG, cs88), Skyrim Special Edition (RPG, cs90),
// Dark Souls 2 (Souls-like, cs80)

async function openDiceWin(page: any) {
  await page.locator(".tab").nth(2).click(); // backlog tab
  await page.locator(".dicebar").click();
  await expect(page.locator("#diceWin")).toBeVisible();
}

test("pool counter reflects filters; genre roll stays in pool", async ({ page }, ti) => {
  const { tr } = meta(ti);
  await openApp(page, ti, tinyState());
  await openDiceWin(page);
  await expect(page.locator("#dPool")).toContainText(`${tr.dicePool}5`);
  await page.locator("#dGenre").selectOption("RPG");
  await expect(page.locator("#dPool")).toContainText(`${tr.dicePool}1`);
  await page.locator("#diceRoll").click();
  await expect(page.locator("#diceWin")).toBeHidden();
  // the only RPG in the backlog is Skyrim Special Edition
  await expect(toast(page)).toContainText("Skyrim Special Edition");
  await expect(page.locator(".card.chosen")).toHaveCount(1);
});

test("cs and library filters narrow the pool", async ({ page }, ti) => {
  const { tr } = meta(ti);
  await openApp(page, ti, tinyState());
  await openDiceWin(page);
  await page.locator("#dCs").selectOption("80");
  // cs≥80: FF VIII (88), Skyrim SE (90), Dark Souls 2 (80)
  await expect(page.locator("#dPool")).toContainText(`${tr.dicePool}3`);
  await page.locator("#dLib").check();
  await expect(page.locator("#dPool")).toContainText(`${tr.dicePool}3`);
  await page.locator("#dSeries").selectOption("Souls");
  await expect(page.locator("#dPool")).toContainText(`${tr.dicePool}1`);
});

test("empty pool shows an honest message and keeps the window open", async ({ page }, ti) => {
  const { tr } = meta(ti);
  await openApp(page, ti, tinyState());
  await openDiceWin(page);
  await page.locator("#dGenre").selectOption("Action");
  await page.locator("#dCs").selectOption("90");
  await expect(page.locator("#dPool")).toContainText(`${tr.dicePool}0`);
  await page.locator("#diceRoll").click();
  await expect(page.locator("#diceWin")).toBeVisible();
  await expect(page.locator("#dPool")).toHaveText(tr.diceEmpty);
  await expect(page.locator("#dPool")).toHaveClass(/empty/);
});

test("reset clears all filters", async ({ page }, ti) => {
  const { tr } = meta(ti);
  await openApp(page, ti, tinyState());
  await openDiceWin(page);
  await page.locator("#dGenre").selectOption("Action");
  await page.locator("#dFresh").check();
  await page.locator("#diceReset").click();
  await expect(page.locator("#dGenre")).toHaveValue("");
  await expect(page.locator("#dFresh")).not.toBeChecked();
  await expect(page.locator("#dPool")).toContainText(`${tr.dicePool}5`);
});

test("filters persist on this device across reloads", async ({ page }, ti) => {
  await openApp(page, ti, tinyState());
  await openDiceWin(page);
  await page.locator("#dGenre").selectOption("RPG");
  await page.locator("#dLib").check();
  await page.reload();
  await openDiceWin(page);
  await expect(page.locator("#dGenre")).toHaveValue("RPG");
  await expect(page.locator("#dLib")).toBeChecked();
});

test("«include on-hold» widens the pool and persists", async ({ page }, ti) => {
  const { tr } = meta(ti);
  const st = tinyState();
  st.games.find((g) => g.name === "Gamma Grove")!.status = "onhold" as any;
  await openApp(page, ti, st);
  await openDiceWin(page);
  // без галочки отложенная Gamma Grove в пул не входит
  await expect(page.locator("#dPool")).toContainText(`${tr.dicePool}4`);
  await page.locator("#dHold").check();
  await expect(page.locator("#dPool")).toContainText(`${tr.dicePool}5`);
  // выбор запоминается на устройстве
  await page.reload();
  await openDiceWin(page);
  await expect(page.locator("#dHold")).toBeChecked();
  await expect(page.locator("#dPool")).toContainText(`${tr.dicePool}5`);
  // сброс фильтров снимает и её
  await page.locator("#diceReset").click();
  await expect(page.locator("#dHold")).not.toBeChecked();
  await expect(page.locator("#dPool")).toContainText(`${tr.dicePool}4`);
});

test("quick roll ignores filters", async ({ page }, ti) => {
  const { tr } = meta(ti);
  await openApp(page, ti, tinyState());
  await openDiceWin(page);
  await page.locator("#dGenre").selectOption("Action");
  await page.locator("#dCs").selectOption("90"); // impossible combo
  await page.locator("#diceQuick").click();
  await expect(page.locator("#diceWin")).toBeHidden();
  await expect(toast(page)).toContainText(tr.dicePick);
});

test("Escape closes the dice window", async ({ page }, ti) => {
  await openApp(page, ti, tinyState());
  await openDiceWin(page);
  await page.keyboard.press("Escape");
  await expect(page.locator("#diceWin")).toBeHidden();
});
