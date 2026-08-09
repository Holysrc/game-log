// Smart dice: small FF filter window over the backlog pool.
// Filters persist per device (localStorage, never synced).
import type { Game } from "./types";
import { state } from "./data";
import { t, gamesWord } from "./i18n";
import { esc } from "./util";
import { rollDice } from "./ui";

var DKEY = "gamelog-dice-v1";

interface DiceFilters {
  genre: string;
  cs: number;
  lib: boolean;
  fresh: boolean;
  series: string;
}

var filters: DiceFilters = { genre: "", cs: 0, lib: false, fresh: false, series: "" };
try {
  var raw = localStorage.getItem(DKEY);
  if (raw) filters = Object.assign(filters, JSON.parse(raw));
} catch (e) {}

function saveFilters(): void {
  try { localStorage.setItem(DKEY, JSON.stringify(filters)); } catch (e) {}
}

function backlog(): Game[] {
  return state.games.filter(function (g) { return g.status === "backlog"; });
}

export function dicePool(): Game[] {
  return backlog().filter(function (g) {
    if (filters.genre) {
      var gs = (g.genres || "").split(",").map(function (s) { return s.trim().toLowerCase(); });
      if (gs.indexOf(filters.genre.toLowerCase()) === -1) return false;
    }
    if (filters.cs && (g.cs || 0) < filters.cs) return false;
    if (filters.lib && !g.source) return false;
    if (filters.fresh && g.time) return false;
    if (filters.series && (g.series || "") !== filters.series) return false;
    return true;
  });
}

function options(values: string[], selected: string, anyLabel: string): string {
  return '<option value="">' + anyLabel + '</option>'
    + values.map(function (v) {
      return '<option value="' + esc(v) + '"' + (v === selected ? " selected" : "") + '>' + esc(v) + '</option>';
    }).join("");
}

function fillForm(): void {
  var genres: Record<string, string> = {}, series: Record<string, 1> = {};
  backlog().forEach(function (g) {
    (g.genres || "").split(",").forEach(function (s) {
      var v = s.trim();
      if (v) genres[v.toLowerCase()] = v; // dedupe case-insensitively, keep first spelling
    });
    if (g.series) series[g.series] = 1;
  });
  var genreVals = Object.keys(genres).sort().map(function (k) { return genres[k]; });
  var seriesVals = Object.keys(series).sort();
  (document.getElementById("dGenre") as HTMLSelectElement).innerHTML =
    options(genreVals, filters.genre, t("dice_any"));
  (document.getElementById("dSeries") as HTMLSelectElement).innerHTML =
    options(seriesVals, filters.series, t("dice_any_f")); // «серия» — женский род
  var csSel = document.getElementById("dCs") as HTMLSelectElement;
  csSel.innerHTML = '<option value="0">' + t("dice_cs_any") + '</option>'
    + [60, 70, 80, 90].map(function (n) {
      return '<option value="' + n + '"' + (filters.cs === n ? " selected" : "") + '>' + n + "+</option>";
    }).join("");
  (document.getElementById("dLib") as HTMLInputElement).checked = filters.lib;
  (document.getElementById("dFresh") as HTMLInputElement).checked = filters.fresh;
  refreshPool();
}

function refreshPool(): void {
  var el = document.getElementById("dPool")!;
  var n = dicePool().length;
  el.textContent = t("dice_pool") + n + gamesWord(n);
  el.classList.toggle("empty", !n);
}

function readForm(): void {
  filters.genre = (document.getElementById("dGenre") as HTMLSelectElement).value;
  filters.series = (document.getElementById("dSeries") as HTMLSelectElement).value;
  filters.cs = +(document.getElementById("dCs") as HTMLSelectElement).value || 0;
  filters.lib = (document.getElementById("dLib") as HTMLInputElement).checked;
  filters.fresh = (document.getElementById("dFresh") as HTMLInputElement).checked;
  saveFilters();
  refreshPool();
}

export function openDice(): void {
  (document.getElementById("diceWin") as any).hidden = false;
  fillForm();
}

export function closeDice(): void {
  (document.getElementById("diceWin") as any).hidden = true;
}

export function applyDiceLang(): void {
  document.getElementById("dTitle")!.textContent = t("dice_title");
  document.getElementById("dGenreLbl")!.textContent = t("dice_genre");
  document.getElementById("dCsLbl")!.textContent = t("dice_cs");
  document.getElementById("dLibLbl")!.textContent = t("dice_lib");
  document.getElementById("dFreshLbl")!.textContent = t("dice_fresh");
  document.getElementById("dSeriesLbl")!.textContent = t("dice_series");
  document.getElementById("diceRoll")!.textContent = t("dice_roll");
  document.getElementById("diceQuick")!.textContent = t("dice_quick");
  document.getElementById("diceReset")!.textContent = t("dice_reset");
  document.getElementById("diceClose")!.setAttribute("aria-label", t("res_close"));
  if (!(document.getElementById("diceWin") as any).hidden) fillForm();
}

export function wireDice(): void {
  document.getElementById("diceClose")!.addEventListener("click", closeDice);
  ["dGenre", "dSeries", "dCs"].forEach(function (id) {
    document.getElementById(id)!.addEventListener("change", readForm);
  });
  ["dLib", "dFresh"].forEach(function (id) {
    document.getElementById(id)!.addEventListener("change", readForm);
  });
  document.getElementById("diceReset")!.addEventListener("click", function () {
    filters = { genre: "", cs: 0, lib: false, fresh: false, series: "" };
    saveFilters();
    fillForm();
  });
  document.getElementById("diceRoll")!.addEventListener("click", function () {
    var pool = dicePool();
    if (!pool.length) {
      var el = document.getElementById("dPool")!;
      el.textContent = t("dice_empty");
      el.classList.add("empty");
      return;
    }
    closeDice();
    rollDice(pool);
  });
  document.getElementById("diceQuick")!.addEventListener("click", function () {
    closeDice();
    rollDice(backlog());
  });
  document.addEventListener("keydown", function (e: any) {
    if (e.key === "Escape" && !(document.getElementById("diceWin") as any).hidden) closeDice();
  });
}
