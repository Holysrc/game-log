// Perf: high-frequency card edits patch the touched cards in place instead of
// rebuilding the whole ~1500-card list (600ms-class jank on phones). The
// #list data-epoch counter increments only on full render() — partial paths
// must keep it unchanged, grouping-affecting paths must bump it.
// Редизайн: быстрые действия (звёзды, флаг, заметка) живут в раскрытии,
// поля коммитятся формой «Изменить» → «Сохранить».
import { test, expect, openApp, openCard, openEdit, saveEdit } from "./app";
import { tinyState } from "./fixtures";

function epoch(page: any): Promise<string | null> {
  return page.locator("#list").getAttribute("data-epoch");
}

test("fav toggle patches every instance of the game, no full render", async ({ page }, ti) => {
  await openApp(page, ti, tinyState());
  const e0 = await epoch(page);
  // Epsilon Echo beaten in 2023 and «long ago» → two cards in year groups
  await openCard(page, "Epsilon Echo", "2023");
  await page.locator(`.card.open [data-act="fav"]`).click();
  await expect(page.locator(`.card[data-id="5"] .favmark`)).toHaveCount(2);
  expect(await epoch(page)).toBe(e0);
  // and back off
  await page.locator(`.card.open [data-act="fav"]`).click();
  await expect(page.locator(`.card[data-id="5"] .favmark`)).toHaveCount(0);
  expect(await epoch(page)).toBe(e0);
});

test("star rating patches in place; rating sort forces a full render", async ({ page }, ti) => {
  await openApp(page, ti, tinyState());
  const e0 = await epoch(page);
  const card = await openCard(page, "Delta Drift", "2024");
  await card.locator(`[data-act="rate"][data-v="2"]`).click();
  await expect(page.locator(`.card.open .star.on`)).toHaveCount(2);
  expect(await epoch(page)).toBe(e0);
  // под сортировкой по моей оценке звёзды меняют порядок — нужен полный рендер
  await page.locator("#sortSel").selectOption("rating");
  const e1 = await epoch(page);
  // карточка пережила пересортировку открытой — жмём звезду прямо в ней
  await expect(page.locator(".card.open")).toHaveCount(1);
  await page.locator(`.card.open [data-act="rate"][data-v="5"]`).click();
  await expect
    .poll(async () => Number(await epoch(page)), { message: "rating sort must trigger full render" })
    .toBeGreaterThan(Number(e1));
});

test("status change regroups the list and bumps the epoch", async ({ page }, ti) => {
  await openApp(page, ti, tinyState());
  const e0 = await epoch(page);
  const card = await openEdit(page, "Beta Blade"); // backlog
  await card.locator(`.opt[data-s="playing"]`).click();
  await saveEdit(page);
  await expect
    .poll(async () => Number(await epoch(page)))
    .toBeGreaterThan(Number(e0));
});

test("genres commit refreshes the no-data chip without a full render", async ({ page }, ti) => {
  await openApp(page, ti, tinyState());
  const chip = page.locator("#nodataChip");
  await expect(chip).toContainText("1"); // Gamma Grove is the only no-data game
  const e0 = await epoch(page);
  const card = await openEdit(page, "Gamma Grove");
  await card.locator(`input[data-ed="genres"]`).fill("rpg"); // canonicalizes to RPG silently
  await saveEdit(page);
  await expect(page.locator(".card.open .fval", { hasText: /^RPG$/ })).toHaveCount(1);
  await expect(chip).toBeHidden(); // счётчик пересчитан точечно
  expect(await epoch(page)).toBe(e0);
});

test("quick note patches in place", async ({ page }, ti) => {
  await openApp(page, ti, tinyState());
  const e0 = await epoch(page);
  const card = await openCard(page, "Beta Blade");
  await card.locator('[data-act="noteadd"]').click();
  const ta = page.locator('textarea[data-act="notequick"]');
  await ta.fill("partial note");
  await ta.blur();
  await expect(
    page.locator(".card", { hasText: "Beta Blade" }).locator(".micnote").first()
  ).toBeVisible();
  expect(await epoch(page)).toBe(e0);
});
