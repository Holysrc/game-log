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

/* ---- серия: тот же справочник, что у платформ/лончеров ---- */

test("series: case-insensitive match canonicalizes silently", async ({ page }, ti) => {
  await openApp(page, ti, tinyState());
  const dialogs = trackDialogs(page, () => true);
  const card = await openCard(page, "Gamma Grove");
  const ser = card.locator(`input[data-act="series"]`);
  await ser.fill("final fantasy");
  await ser.blur();
  await expect(page.locator(`.card.open input[data-act="series"]`)).toHaveValue("Final Fantasy");
  expect(dialogs, "canonical series match must not ask").toEqual([]);
});

test("series: a typo suggests the closest existing series", async ({ page }, ti) => {
  await openApp(page, ti, tinyState());
  const dialogs = trackDialogs(page, (msg) => msg.includes("Final Fantasy"));
  const card = await openCard(page, "Gamma Grove");
  const ser = card.locator(`input[data-act="series"]`);
  await ser.fill("Final Fantsy");
  await ser.blur();
  await expect(page.locator(`.card.open input[data-act="series"]`)).toHaveValue("Final Fantasy");
  expect(dialogs).toHaveLength(1);
});

test("series: a genuinely new series asks and rolls back on decline", async ({ page }, ti) => {
  await openApp(page, ti, tinyState());
  const dialogs = trackDialogs(page, () => false);
  const card = await openCard(page, "Dark Souls"); // series: Souls
  const ser = card.locator(`input[data-act="series"]`);
  await ser.fill("Metroid");
  await ser.blur();
  await expect(page.locator(`.card.open input[data-act="series"]`)).toHaveValue("Souls");
  expect(dialogs).toHaveLength(1);
  expect(dialogs[0]).toContain("Metroid");
});

/* ---- жанры: справочник по каждому значению из списка через запятую ---- */

test("genres: tokens canonicalize case-insensitively without dialogs", async ({ page }, ti) => {
  await openApp(page, ti, tinyState());
  const dialogs = trackDialogs(page, () => true);
  const card = await openCard(page, "Gamma Grove");
  const gen = card.locator(`input[data-act="genres"]`);
  await gen.fill("rpg,  horror");
  await gen.blur();
  await expect(page.locator(`.card.open input[data-act="genres"]`)).toHaveValue("RPG, Horror");
  expect(dialogs, "existing genres must not ask").toEqual([]);
});

test("genres: a typo in a token suggests the existing genre", async ({ page }, ti) => {
  await openApp(page, ti, tinyState());
  const dialogs = trackDialogs(page, (msg) => msg.includes("Racing"));
  const card = await openCard(page, "Gamma Grove");
  const gen = card.locator(`input[data-act="genres"]`);
  await gen.fill("Racin");
  await gen.blur();
  await expect(page.locator(`.card.open input[data-act="genres"]`)).toHaveValue("Racing");
  expect(dialogs).toHaveLength(1);
});

test("genres: declining a new token drops it, the rest survive", async ({ page }, ti) => {
  await openApp(page, ti, tinyState());
  const dialogs = trackDialogs(page, () => false);
  const card = await openCard(page, "Gamma Grove");
  const gen = card.locator(`input[data-act="genres"]`);
  await gen.fill("rpg, Weirdcore");
  await gen.blur();
  await expect(page.locator(`.card.open input[data-act="genres"]`)).toHaveValue("RPG");
  expect(dialogs).toHaveLength(1); // спрашивали только про Weirdcore
  expect(dialogs[0]).toContain("Weirdcore");
});

test("genres: suggestion tap appends to the list", async ({ page }, ti) => {
  await openApp(page, ti, tinyState());
  trackDialogs(page, () => true);
  const card = await openCard(page, "Alpha Quest"); // genres: RPG, Action
  const gen = card.locator(`input[data-act="genres"]`);
  await gen.click();
  await gen.fill("RPG, Action, Rac");
  const sug = card.locator(`.sugwrap:has(input[data-act="genres"]) .sugbtn`, { hasText: "Racing" });
  await expect(sug).toBeVisible();
  await sug.click();
  await expect(page.locator(`.card.open input[data-act="genres"]`)).toHaveValue("RPG, Action, Racing");
});
