// State: load/save/migrate + small data helpers. Persistence side effects
// (file autosave, remote push) are attached via onSave hooks from main.ts.
import type { Game, State } from "./types";
import { t } from "./i18n";
import { toast } from "./util";

export var KEY = "gamelog-v1";
export var STATUS_KEYS = ["backlog", "playing", "done", "dropped"];
export var COMMON_PLATFORMS = ["PC","PS5","PS4","PS3","PS2","PS1","PSP","PS Vita","Xbox Series","Xbox 360",
  "Switch","Switch 2","Wii","GameCube","N64","SNES","NES","GBA","DS","3DS","Saturn","Dreamcast","Genesis","Steam Deck","Android"];
export var COMMON_SOURCES = ["Steam","GOG","Epic","Xbox","EA app","Ubisoft Connect","Battle.net","Эмулятор","Диск","Playnite"];

export var storageOK = true;

function seed(): State {
  // стартовое состояние пустое: реальные данные приезжают из синка (гиста)
  return { nextId: 1, games: [], collapsed: {} };
}

function load(): State {
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) {
      var p = JSON.parse(raw);
      if (p && p.games) return p;
    }
  } catch (e) {
    storageOK = false;
  }
  return seed();
}

export var state: State = load();

export function replaceState(s: State): void {
  state = s;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
}

var saveHooks: Array<() => void> = [];
export function onSave(fn: () => void): void {
  saveHooks.push(fn);
}

export function save(): void {
  state.updatedAt = Date.now();
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    if (storageOK) {
      storageOK = false;
      toast(t("storage_warn"));
    }
  }
  saveHooks.forEach(function (fn) { fn(); });
}

export function cleanPlat(p: string): string {
  return p.replace(/\s*\(Windows\)/i, "")
    .replace(/^Microsoft\s+/i, "")
    .replace(/^Nintendo\s+/i, "")
    .replace(/^Sony\s+/i, "")
    .replace(/^PlayStation\s*/i, "PS")
    .replace(/^Sega\s+/i, "")
    .trim();
}

export function migrate(st: State): State {
  if (!st.collapsed) st.collapsed = {};
  if (!Array.isArray(st.noMerge)) st.noMerge = [];
  (st.games || []).forEach(function (g: Game) {
    if (!Array.isArray(g.years)) {
      g.years = g.status === "done" ? [g.year || 0] : [];
      delete g.year;
    }
    if (g.platform) g.platform = cleanPlat(g.platform);
    if (g.oldCount && g.oldCount > 1) {
      g.counts = g.counts || {};
      if (!g.counts[0]) g.counts[0] = g.oldCount;
    }
    delete g.oldCount;
  });
  return st;
}

export function initData(): void {
  migrate(state);
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
}

export function cnt(g: Game, y: number): number {
  return (g.counts && g.counts[y]) || 1;
}

export function addYear(g: Game, y: number): void {
  if (g.years.indexOf(y) === -1) {
    g.years.push(y);
    g.years.sort(function (a, b) { return a - b; });
  }
}

export function yLabel(y: number | string): string | number {
  return +y === 0 ? t("long_ago") : y as number;
}
