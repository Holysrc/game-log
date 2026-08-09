// Shared test harness: app opener, i18n expectations, console-clean auto-check.
import { test as base, expect, Page, TestInfo } from "@playwright/test";
import { State } from "./fixtures";

export { expect };

export const L = {
  ru: {
    title: "Журнал игр",
    tabs: ["Все", "Играю", "Беклог", "Пройдено", "Брошено", "Каталог", "⚑ Избранное"],
    add: "+ Добавить",
    doneLbl: "Пройдено",
    playingLbl: "Играю",
    backlogLbl: "Беклог",
    droppedLbl: "Брошено",
    longAgo: "Давно",
    dicePick: "Судьба выбрала",
    addedTo: "добавлена в",
    impDone: "Импорт: добавлено",
    merged: "Объединено",
    restored: "Восстановлено из",
    sync: "синк",
    searchPh: "Поиск по играм…"
  },
  en: {
    title: "Game Log",
    tabs: ["All", "Playing", "Backlog", "Beaten", "Dropped", "Catalog", "⚑ Favorites"],
    add: "+ Add",
    doneLbl: "Beaten",
    playingLbl: "Playing",
    backlogLbl: "Backlog",
    droppedLbl: "Dropped",
    longAgo: "Way back",
    dicePick: "Fate has chosen",
    addedTo: "added to",
    impDone: "Import: added",
    merged: "Merged",
    restored: "Restored from",
    sync: "sync",
    searchPh: "Search games…"
  }
} as const;

export type Lang = keyof typeof L;

export function meta(testInfo: TestInfo) {
  const lang = (testInfo.project.metadata.lang || "ru") as Lang;
  const form = (testInfo.project.metadata.form || "mobile") as "mobile" | "desktop";
  return { lang, form, tr: L[lang] };
}

type Fx = { consoleIssues: string[] };

export const test = base.extend<Fx>({
  consoleIssues: [
    async ({ page }, use) => {
      const issues: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error" || msg.type() === "warning") {
          issues.push(`${msg.type()}: ${msg.text()}`);
        }
      });
      page.on("pageerror", (err) => issues.push(`pageerror: ${err.message}`));
      await use(issues);
      const allowed: RegExp[] = (page as any).__allowedConsole || [];
      const real = issues.filter((i) => !allowed.some((re) => re.test(i)));
      expect(real, "console must be clean (§7)").toEqual([]);
    },
    { auto: true }
  ]
});

export async function openApp(
  page: Page,
  testInfo: TestInfo,
  state?: State | null,
  opts: {
    syncCfg?: { token: string; gist: string };
    beforeGoto?: () => Promise<void>;
  } = {}
) {
  const { lang } = meta(testInfo);
  await page.addInitScript(
    ({ state, lang, syncCfg }) => {
      try {
        // seed fixture only once so reload-persistence keeps user changes
        if (state && !localStorage.getItem("gamelog-v1"))
          localStorage.setItem("gamelog-v1", JSON.stringify(state));
        localStorage.setItem("gamelog-lang", lang);
        if (syncCfg) localStorage.setItem("gamelog-sync-v1", JSON.stringify(syncCfg));
        // force fallback paths (download link / file input) instead of FS Access pickers
        Object.defineProperty(window, "showSaveFilePicker", { value: undefined });
        Object.defineProperty(window, "showOpenFilePicker", { value: undefined });
      } catch (e) {}
    },
    { state: state ?? null, lang, syncCfg: opts.syncCfg ?? null }
  );
  // real network is forbidden in tests; sync specs override this route
  await page.route("https://api.github.com/**", (r) => r.abort());
  await page.route("https://script.google.com/**", (r) => r.abort());
  if (opts.beforeGoto) await opts.beforeGoto();
  await page.goto("/");
  await expect(page.locator("h1")).toContainText(meta(testInfo).tr.title);
}

// permit console noise that a test deliberately provokes (e.g. mocked network failure)
export function allowConsole(page: Page, re: RegExp) {
  ((page as any).__allowedConsole ||= []).push(re);
}

export async function expectNoHorizontalOverflow(page: Page) {
  const over = await page.evaluate(() => {
    const d = document.documentElement;
    return { sw: d.scrollWidth, cw: d.clientWidth };
  });
  expect(over.sw, `scrollWidth ${over.sw} must not exceed viewport ${over.cw}`).toBeLessThanOrEqual(
    over.cw + 1
  );
}

export async function openCard(page: Page, name: string, ctx = "s") {
  const card = page.locator(`.card[data-ctx="${ctx}"]`, { hasText: name }).first();
  await card.locator(".name").click();
  await expect(page.locator(".card.open")).toHaveCount(1);
  return page.locator(".card.open");
}

export function toast(page: Page) {
  return page.locator("#toast.show");
}
