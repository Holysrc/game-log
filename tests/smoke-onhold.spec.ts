// «Отложено» (onhold): пятый статус — «прервал, вернусь», в отличие от
// «Брошено». Аддитивен: старые бэкапы и CSV работают как раньше.
import { test, expect, openApp, openEdit, saveEdit, meta, toast } from "./app";
import { tinyState } from "./fixtures";

test("status picker moves a game to «On hold»; tab and section filter it", async ({ page }, ti) => {
  const { tr } = meta(ti);
  await openApp(page, ti, tinyState());
  const card = await openEdit(page, "Beta Blade");
  // выбор статуса в форме: все статусы, кроме «Пройдено» (его задаёт год)
  await expect(card.locator(".opt")).toHaveCount(4);
  await card.locator(`.opt[data-s="onhold"]`).click();
  await saveEdit(page);
  // счётчики шапки: беклог уменьшился, отложенные в тройку не входят
  await expect(page.locator("#stBacklog")).toHaveText("4");
  await expect(page.locator("#stPlaying")).toHaveText("1");
  // секция «Отложено» на «Все» — между беклогом и годами
  const sec = page.locator(".sec", { has: page.locator(`.yearhead[data-key="onhold"]`) });
  await expect(sec.locator(".card", { hasText: "Beta Blade" })).toHaveCount(1);
  // карточка осталась раскрытой после сохранения — бейдж статуса в просмотре
  await expect(page.locator(".card.open .badge.onhold")).toContainText(tr.onholdLbl);
  // вкладка «Отложено»
  await page.locator(`.tab[data-f="onhold"]`).click();
  await expect(page.locator(".card")).toHaveCount(1);
  await expect(page.locator(".card .name")).toHaveText("Beta Blade");
  // dropped остался нетронутым — никакой автоматической миграции
  const zeta = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("gamelog-v1")!).games.find((g: any) => g.name === "Zeta Zephyr").status
  );
  expect(zeta).toBe("dropped");
});

test("CSV import maps Playnite «On Hold» to onhold", async ({ page }, ti) => {
  const { tr } = meta(ti);
  await openApp(page, ti, tinyState());
  const csv = [
    "Name,Completion Status",
    '"Gamma Grove","On Hold"', // существующий беклог — подтягивается вверх
    '"Delta Drift","On Hold"', // done не понижается
    '"Paused Newcomer","On Hold"' // новая игра сразу onhold
  ].join("\n");
  await page.setInputFiles("#csvFile", {
    name: "playnite.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv, "utf-8")
  });
  await expect(toast(page)).toContainText(`${tr.impDone} 1`);
  const by = await page.evaluate(() => {
    const st = JSON.parse(localStorage.getItem("gamelog-v1")!);
    const m: Record<string, string> = {};
    st.games.forEach((g: any) => { m[g.name] = g.status; });
    return m;
  });
  expect(by["Gamma Grove"]).toBe("onhold");
  expect(by["Delta Drift"]).toBe("done");
  expect(by["Paused Newcomer"]).toBe("onhold");
});

test("legacy backup without onhold restores cleanly and can adopt the status", async ({ page }, ti) => {
  const { tr } = meta(ti);
  await openApp(page, ti, tinyState());
  // старый формат: только четыре статуса, никаких новых полей
  const legacy = {
    nextId: 3,
    updatedAt: 1700000000000,
    games: [
      { id: 1, name: "Legacy One", status: "backlog", years: [] },
      { id: 2, name: "Legacy Done", status: "done", years: [2020] }
    ],
    collapsed: {}
  };
  await page.setInputFiles("#jsonFile", {
    name: "game-log.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(legacy), "utf-8")
  });
  await expect(toast(page)).toContainText(tr.restored);
  await expect(page.locator("#stBacklog")).toHaveText("1");
  // и игра из старого файла спокойно получает новый статус
  const card = await openEdit(page, "Legacy One");
  await card.locator(`.opt[data-s="onhold"]`).click();
  await saveEdit(page);
  await expect(page.locator(`.tab[data-f="onhold"]`)).toBeVisible();
  const st = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("gamelog-v1")!).games.find((g: any) => g.name === "Legacy One").status
  );
  expect(st).toBe("onhold");
});
