// ТЗ 2: платформы и лончеры — справочник из живых данных.
// Нормализация ввода, канонизация без учёта регистра, подтверждение новых
// значений, Левенштейн-подсказка при опечатке.
import { test, expect, openApp, openCard } from "./app";
import { tinyState } from "./fixtures";

function trackDialogs(page: any, respond: (msg: string) => boolean) {
  const seen: string[] = [];
  page.on("dialog", (d: any) => {
    seen.push(d.message());
    if (respond(d.message())) d.accept();
    else d.dismiss();
  });
  return seen;
}

test("case-insensitive match saves the canonical spelling silently", async ({ page }, ti) => {
  await openApp(page, ti, tinyState());
  const dialogs = trackDialogs(page, () => true);
  const card = await openCard(page, "Gamma Grove");
  const plat = card.locator(`input[data-act="plat"]`);
  await plat.fill("pc");
  await plat.blur();
  await expect(page.locator(`.card.open input[data-act="plat"]`)).toHaveValue("PC");
  // источник: «gog» уже есть в данных как «GOG»
  const src = page.locator(`.card.open input[data-act="src"]`);
  await src.fill("gog");
  await src.blur();
  await expect(page.locator(`.card.open input[data-act="src"]`)).toHaveValue("GOG");
  expect(dialogs, "canonical matches must not ask anything").toEqual([]);
});

test("whitespace is normalized before matching", async ({ page }, ti) => {
  await openApp(page, ti, tinyState());
  trackDialogs(page, () => true);
  const card = await openCard(page, "Gamma Grove");
  const plat = card.locator(`input[data-act="plat"]`);
  await plat.fill("  steam   deck ");
  await plat.blur();
  await expect(page.locator(`.card.open input[data-act="plat"]`)).toHaveValue("Steam Deck");
});

test("a genuinely new platform is created only after confirmation", async ({ page }, ti) => {
  await openApp(page, ti, tinyState());
  const dialogs = trackDialogs(page, () => true);
  const card = await openCard(page, "Gamma Grove");
  const plat = card.locator(`input[data-act="plat"]`);
  await plat.fill("Amiga");
  await plat.blur();
  await expect(page.locator(`.card.open input[data-act="plat"]`)).toHaveValue("Amiga");
  expect(dialogs).toHaveLength(1);
  expect(dialogs[0]).toContain("Amiga");
  // теперь «Amiga» — в справочнике: другой регистр канонизируется молча
  const src = page.locator(`.card.open input[data-act="plat"]`);
  await src.fill("amiga");
  await src.blur();
  await expect(page.locator(`.card.open input[data-act="plat"]`)).toHaveValue("Amiga");
  expect(dialogs).toHaveLength(1); // новых вопросов не было
});

test("declining the new-value dialog rolls the field back", async ({ page }, ti) => {
  await openApp(page, ti, tinyState());
  trackDialogs(page, () => false); // отказываемся от всего
  const card = await openCard(page, "Beta Blade"); // platform: PS5
  const plat = card.locator(`input[data-act="plat"]`);
  await plat.fill("Amiga");
  await plat.blur();
  await expect(page.locator(`.card.open input[data-act="plat"]`)).toHaveValue("PS5");
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("gamelog-v1")!).games.find((g: any) => g.name === "Beta Blade").platform
  );
  expect(stored).toBe("PS5");
});

test("a 1-2 letter typo suggests the closest existing value", async ({ page }, ti) => {
  await openApp(page, ti, tinyState());
  const dialogs = trackDialogs(page, (msg) => msg.includes("Xbox Series"));
  const card = await openCard(page, "Gamma Grove");
  const plat = card.locator(`input[data-act="plat"]`);
  await plat.fill("Xbox Seris");
  await plat.blur();
  await expect(page.locator(`.card.open input[data-act="plat"]`)).toHaveValue("Xbox Series");
  expect(dialogs).toHaveLength(1);
  expect(dialogs[0]).toContain("Xbox Series");
});

test("declining the typo suggestion falls through to the new-value dialog", async ({ page }, ti) => {
  await openApp(page, ti, tinyState());
  const dialogs = trackDialogs(page, (msg) => !msg.includes("Xbox Series")); // «похоже» — нет, «создать» — да
  const card = await openCard(page, "Gamma Grove");
  const plat = card.locator(`input[data-act="plat"]`);
  await plat.fill("Xbox Seriz");
  await plat.blur();
  await expect(page.locator(`.card.open input[data-act="plat"]`)).toHaveValue("Xbox Seriz");
  expect(dialogs).toHaveLength(2);
});
