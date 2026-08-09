// «Итоги» — fullscreen FF mission-results window with per-period stats.
// Period: a year number, 0 («Давно») or "all".
import type { Game } from "./types";
import { state, cnt, yLabel } from "./data";
import { t } from "./i18n";
import { esc } from "./util";

type Period = number | "all";

var current: Period | null = null;

function inPeriod(g: Game, p: Period): boolean {
  if (p === "all") return g.years.length > 0;
  return g.years.indexOf(p) !== -1;
}

function runsIn(g: Game, p: Period): number {
  if (p === "all") {
    var n = 0;
    g.years.forEach(function (y) { n += cnt(g, y); });
    return n;
  }
  return g.years.indexOf(p) !== -1 ? cnt(g, p) : 0;
}

function periodYears(): number[] {
  var set: Record<number, 1> = {};
  state.games.forEach(function (g) {
    g.years.forEach(function (y) { set[y] = 1; });
  });
  return Object.keys(set).map(Number).sort(function (a, b) { return b - a; }); // desc, 0 last
}

function topCounts(games: Game[], pick: (g: Game) => string[] | null, n: number): Array<[string, number]> {
  var map: Record<string, number> = {};
  games.forEach(function (g) {
    var vals = pick(g);
    if (!vals) return;
    vals.forEach(function (v) { if (v) map[v] = (map[v] || 0) + 1; });
  });
  return Object.keys(map)
    .map(function (k): [string, number] { return [k, map[k]]; })
    .sort(function (a, b) { return b[1] - a[1] || a[0].localeCompare(b[0]); })
    .slice(0, n);
}

function starsFor(r: number): string {
  var full = Math.round(r);
  var out = "";
  for (var i = 1; i <= 5; i++) out += i <= full ? "★" : '<span class="off">★</span>';
  return out;
}

function fmtHours(sec: number): string {
  var h = sec / 3600;
  if (h >= 1) return Math.round(h) + t("h");
  return Math.round(sec / 60) + t("min");
}

function row(label: string, value: string, cls?: string): string {
  return '<div class="rrow' + (cls ? " " + cls : "") + '"><span class="rlabel">' + label
    + '</span><span class="rdots"></span><span class="rval">' + value + '</span></div>';
}

function renderPeriod(p: Period): string {
  var games = state.games.filter(function (g) { return inPeriod(g, p); });
  if (!games.length) {
    return '<div class="rempty">' + t("res_empty") + '</div>';
  }
  var runs = 0;
  games.forEach(function (g) { runs += runsIn(g, p); });
  var hours = 0;
  games.forEach(function (g) { hours += g.time || 0; });
  var rated = games.filter(function (g) { return !!g.rating; });
  var avg = rated.length
    ? rated.reduce(function (s, g) { return s + (g.rating || 0); }, 0) / rated.length
    : 0;

  var html = "";
  html += row(t("res_beaten"), String(games.length));
  if (runs > games.length) html += row(t("res_runs"), String(runs));
  html += row(t("res_hours"), hours ? fmtHours(hours) : t("res_no_data"));
  html += row(
    t("res_avg"),
    rated.length
      ? '<span class="rstars">' + starsFor(avg) + '</span> ' + avg.toFixed(1)
      : t("res_no_data")
  );

  // headline picks
  var goty: Game | null = null;
  rated.forEach(function (g) {
    if (!goty
      || (g.rating || 0) > (goty.rating || 0)
      || ((g.rating || 0) === (goty.rating || 0) && (g.time || 0) > (goty.time || 0))) goty = g;
  });
  var longest: Game | null = null;
  games.forEach(function (g) {
    if ((g.time || 0) > 0 && (!longest || (g.time || 0) > (longest.time || 0))) longest = g;
  });
  var serRuns: Record<string, number> = {};
  games.forEach(function (g) {
    if (g.series) serRuns[g.series] = (serRuns[g.series] || 0) + runsIn(g, p);
  });
  var topSer = Object.keys(serRuns)
    .map(function (k): [string, number] { return [k, serRuns[k]]; })
    .sort(function (a, b) { return b[1] - a[1] || a[0].localeCompare(b[0]); })[0];

  var picks = "";
  if (goty) {
    picks += row(
      p === "all" ? t("res_goty_all") : t("res_goty"),
      '<span class="rgold">' + esc((goty as Game).name) + '</span> <span class="rstars">'
        + starsFor((goty as Game).rating || 0) + '</span>',
      "wide"
    );
  }
  if (longest) {
    picks += row(
      t("res_longest"),
      esc((longest as Game).name) + ' · <span class="rgold">' + fmtHours((longest as Game).time || 0) + '</span>',
      "wide"
    );
  }
  if (topSer && topSer[1] > 0) {
    picks += row(
      p === "all" ? t("res_series_all") : t("res_series"),
      '❖ ' + esc(topSer[0]) + ' · <span class="rgold">' + topSer[1] + '</span>',
      "wide"
    );
  }
  if (picks) html += '<div class="rgroup">' + picks + '</div>';

  // top-3 genres / platforms
  var genres = topCounts(games, function (g) {
    return g.genres ? g.genres.split(",").map(function (s) { return s.trim(); }) : null;
  }, 3);
  var platforms = topCounts(games, function (g) {
    return g.platform ? [g.platform] : null;
  }, 3);
  if (genres.length) {
    html += '<div class="rgroup"><div class="rhead">' + t("res_top_genres") + '</div>'
      + genres.map(function (kv) { return row(esc(kv[0]), String(kv[1])); }).join("") + '</div>';
  }
  if (platforms.length) {
    html += '<div class="rgroup"><div class="rhead">' + t("res_top_platforms") + '</div>'
      + platforms.map(function (kv) { return row(esc(kv[0]), String(kv[1])); }).join("") + '</div>';
  }

  // launcher breakdown with CSS bars
  var launchers = topCounts(games, function (g) {
    return g.source ? [g.source] : null;
  }, 99);
  if (launchers.length) {
    var max = launchers[0][1];
    html += '<div class="rgroup"><div class="rhead">' + t("res_launchers") + '</div>'
      + launchers.map(function (kv) {
        var w = Math.max(6, Math.round((kv[1] / max) * 100));
        return '<div class="rbar"><span class="rlabel">' + esc(kv[0]) + '</span>'
          + '<span class="rtrack"><span class="rfill" style="width:' + w + '%"></span></span>'
          + '<span class="rval">' + kv[1] + '</span></div>';
      }).join("") + '</div>';
  }
  return html;
}

export function renderResults(): void {
  var win = document.getElementById("resultsWin")!;
  if ((win as any).hidden) return;
  var years = periodYears();
  if (current === null) {
    var cy = new Date().getFullYear();
    current = years.indexOf(cy) !== -1 ? cy : (years.length ? years[0] : "all");
  }
  var chips = '<button class="rchip' + (current === "all" ? " active" : "") + '" data-period="all">'
    + t("res_alltime") + '</button>'
    + years.map(function (y) {
      return '<button class="rchip' + (current === y ? " active" : "") + '" data-period="' + y + '">'
        + yLabel(y) + '</button>';
    }).join("");
  document.getElementById("resPeriods")!.innerHTML = chips;
  document.getElementById("resBody")!.innerHTML = renderPeriod(current);
}

export function openResults(): void {
  (document.getElementById("resultsWin") as any).hidden = false;
  document.body.classList.add("noscroll");
  current = null; // recompute default period from fresh data
  renderResults();
}

export function closeResults(): void {
  (document.getElementById("resultsWin") as any).hidden = true;
  document.body.classList.remove("noscroll");
}

export function applyResultsLang(): void {
  document.getElementById("resTitle")!.textContent = t("res_title");
  var btn = document.getElementById("resultsBtn")!;
  btn.setAttribute("aria-label", t("res_btn_aria"));
  var close = document.getElementById("resClose")!;
  close.setAttribute("aria-label", t("res_close"));
  renderResults();
}

export function wireResults(): void {
  document.getElementById("resultsBtn")!.addEventListener("click", openResults);
  document.getElementById("resClose")!.addEventListener("click", closeResults);
  document.getElementById("resPeriods")!.addEventListener("click", function (e: any) {
    var chip = e.target.closest(".rchip");
    if (!chip) return;
    current = chip.dataset.period === "all" ? "all" : +chip.dataset.period;
    renderResults();
  });
  document.addEventListener("keydown", function (e: any) {
    if (e.key === "Escape" && !(document.getElementById("resultsWin") as any).hidden) closeResults();
  });
}
