// ТЗ 2: платформы и лончеры — справочник из живых данных.
// Нормализация ввода, канонизация без учёта регистра, подтверждение новых
// значений, Левенштейн-подсказка при опечатке.
// Редизайн: поля правятся в форме «Изменить», справочник срабатывает на
// «Сохранить» (confirm-диалоги задаются в момент коммита формы).
import { test, expect, openApp, openEdit, saveEdit } from "./app";
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

// значение поля в режиме просмотра раскрытой карточки
function fval(page: any, text: RegExp) {
  return page.locator(".card.open .fval", { hasText: text });
}

async function storedField(page: any, name: string, field: string) {
  return page.evaluate(
    ([n, f]: string[]) =>
      JSON.parse(localStorage.getItem("gamelog-v1")!).games.find((g: any) => g.name === n)[f],
    [name, field]
  );
}

test("case-insensitive match saves the canonical spelling silently", async ({ page }, ti) => {
  await openApp(page, ti, tinyState());
  const dialogs = trackDialogs(page, () => true);
  const card = await openEdit(page, "Gamma Grove");
  await card.locator(`input[data-ed="plat"]`).fill("pc");
  // источник: «gog» уже есть в данных как «GOG»
  await card.locator(`input[data-ed="src"]`).fill("gog");
  await saveEdit(page);
  await expect(fval(page, /^PC$/)).toHaveCount(1);
  await expect(fval(page, /^GOG$/)).toHaveCount(1);
  expect(await storedField(page, "Gamma Grove", "platform")).toBe("PC");
  expect(await storedField(page, "Gamma Grove", "source")).toBe("GOG");
  expect(dialogs, "canonical matches must not ask anything").toEqual([]);
});

test("whitespace is normalized before matching", async ({ page }, ti) => {
  await openApp(page, ti, tinyState());
  trackDialogs(page, () => true);
  const card = await openEdit(page, "Gamma Grove");
  await card.locator(`input[data-ed="plat"]`).fill("  steam   deck ");
  await saveEdit(page);
  await expect(fval(page, /^Steam Deck$/)).toHaveCount(1);
  expect(await storedField(page, "Gamma Grove", "platform")).toBe("Steam Deck");
});

test("a genuinely new platform is created only after confirmation", async ({ page }, ti) => {
  await openApp(page, ti, tinyState());
  const dialogs = trackDialogs(page, () => true);
  const card = await openEdit(page, "Gamma Grove");
  await card.locator(`input[data-ed="plat"]`).fill("Amiga");
  await saveEdit(page);
  await expect(fval(page, /^Amiga$/)).toHaveCount(1);
  expect(dialogs).toHaveLength(1);
  expect(dialogs[0]).toContain("Amiga");
  // теперь «Amiga» — в справочнике: другой регистр канонизируется молча
  const again = await openEdit(page, "Beta Blade");
  await again.locator(`input[data-ed="plat"]`).fill("amiga");
  await saveEdit(page);
  await expect(fval(page, /^Amiga$/)).toHaveCount(1);
  expect(await storedField(page, "Beta Blade", "platform")).toBe("Amiga");
  expect(dialogs).toHaveLength(1); // новых вопросов не было
});

test("declining the new-value dialog rolls the field back", async ({ page }, ti) => {
  await openApp(page, ti, tinyState());
  trackDialogs(page, () => false); // отказываемся от всего
  const card = await openEdit(page, "Beta Blade"); // platform: PS5
  await card.locator(`input[data-ed="plat"]`).fill("Amiga");
  await saveEdit(page);
  await expect(fval(page, /^PS5$/)).toHaveCount(1);
  expect(await storedField(page, "Beta Blade", "platform")).toBe("PS5");
});

test("a 1-2 letter typo suggests the closest existing value", async ({ page }, ti) => {
  await openApp(page, ti, tinyState());
  const dialogs = trackDialogs(page, (msg) => msg.includes("Xbox Series"));
  const card = await openEdit(page, "Gamma Grove");
  await card.locator(`input[data-ed="plat"]`).fill("Xbox Seris");
  await saveEdit(page);
  await expect(fval(page, /^Xbox Series$/)).toHaveCount(1);
  expect(dialogs).toHaveLength(1);
  expect(dialogs[0]).toContain("Xbox Series");
});

test("declining the typo suggestion falls through to the new-value dialog", async ({ page }, ti) => {
  await openApp(page, ti, tinyState());
  const dialogs = trackDialogs(page, (msg) => !msg.includes("Xbox Series")); // «похоже» — нет, «создать» — да
  const card = await openEdit(page, "Gamma Grove");
  await card.locator(`input[data-ed="plat"]`).fill("Xbox Seriz");
  await saveEdit(page);
  await expect(fval(page, /^Xbox Seriz$/)).toHaveCount(1);
  expect(dialogs).toHaveLength(2);
});
