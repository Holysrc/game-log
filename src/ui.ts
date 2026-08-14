// Rendering + all list/chrome interaction. Faithful port of the legacy IIFE.
import type { Game } from "./types";
import {
  state, save, cnt, addYear, yLabel,
  STATUS_KEYS, COMMON_PLATFORMS, COMMON_SOURCES
} from "./data";
import { t, stLabel, lang, setLang, gamesWord, runsWord } from "./i18n";
import { esc, norm, toast } from "./util";

/* ================= ui state ================= */
export var filter = "all", query = "", openId: string | null = null, mergeAsk: any = null;
var SORTKEY = "gamelog-sort";
var sortMode = "default";
try { sortMode = localStorage.getItem(SORTKEY) || "default"; } catch (e) {}

export function setOpenId(v: string | null): void { openId = v; }

function sortItems(arr: Game[]): Game[] {
  if (sortMode === "default") return arr;
  var c = arr.slice();
  if (sortMode === "name") c.sort(function (a, b) { return a.name.localeCompare(b.name, undefined, { sensitivity: "base" }); });
  else c.sort(function (a, b) { return ((b as any)[sortMode] || 0) - ((a as any)[sortMode] || 0); }); // числовые — по убыванию, пустые в конец
  return c;
}

/* ================= render ================= */
function counts() {
  var c: any = { playing: 0, backlog: 0, done: 0, dropped: 0, onhold: 0 };
  state.games.forEach(function (g) { c[g.status]++; });
  return c;
}

function cardHTML(g: Game, ctx: number | null): string {
  // ctx: null — карточка в секции статуса; число — экземпляр в группе года (0 = Давно)
  var key = g.id + "@" + (ctx === null ? "s" : ctx);
  var open = key === openId;
  var cy = new Date().getFullYear();

  var badge;
  if (ctx !== null) {
    var cc = cnt(g, +ctx);
    var mult = cc > 1 ? " ×" + cc : "";
    badge = '<span class="badge done">' + stLabel("done") + ' · ' + yLabel(ctx) + mult + '</span>';
  } else {
    badge = '<span class="badge ' + g.status + '">' + stLabel(g.status) + '</span>';
  }
  // в секции статуса покажем историю прохождений чипом
  var histChip = "";
  if (ctx === null && g.years.length) {
    var hist = g.years.map(function (y) {
      var yc = cnt(g, +y);
      return (+y === 0 ? t("ago_short") : y) + (yc > 1 ? "×" + yc : "");
    }).join(", ");
    histChip = '<span class="plat">✓ ' + hist + '</span>';
  }
  var noteChip = g.note ? '<span class="plat">📝</span>' : "";

  var actions = "";
  if (open) {
    actions += '<input class="platinput namefield" data-act="rename" placeholder="' + t("name_ph") + '" '
      + 'value="' + esc(g.name) + '">';
    actions += '<button class="btn' + (g.fav ? " gold" : "") + '" data-act="fav">' + (g.fav ? t("fav_off") : t("fav_on")) + '</button>';
    if (ctx === null) {
      actions += STATUS_KEYS.filter(function (s) { return s !== g.status && s !== "done"; })
        .map(function (s) {
          return '<button class="btn" data-act="status" data-s="' + s + '">' + stLabel(s) + '</button>';
        }).join("");
      // добавить прохождение в любом году
      var missing: number[] = [];
      for (var ay = cy; ay >= 2000; ay--) if (g.years.indexOf(ay) === -1) missing.push(ay);
      var oldOpt = g.years.indexOf(0) === -1 ? '<option value="old">' + t("long_ago") + '</option>' : "";
      if (missing.length || oldOpt) {
        actions += '<span class="mpair">'
          + '<select data-act="addyearsel" class="gold">'
          + '<option value="">' + t("add_year") + '</option>'
          + missing.map(function (y) { return '<option value="' + y + '">' + y + '</option>'; }).join("")
          + oldOpt
          + '</select>'
          + '<span class="xmark">×</span>'
          + '<input class="platinput oldcnt" data-role="precount" type="number" min="1" max="99" value="1" title="' + t("times").trim() + '">'
          + '</span>';
      }
    } else {
      var yearOpts = '<option value="0"' + (+ctx === 0 ? " selected" : "") + '>' + t("long_ago") + '</option>';
      for (var y = cy + 1; y >= 2000; y--) {
        yearOpts += '<option value="' + y + '"' + (+ctx === y ? " selected" : "") + '>' + y + '</option>';
      }
      actions += '<select data-act="year">' + yearOpts + '</select>';
      actions += '<input class="platinput oldcnt" data-act="oldcount" type="number" min="1" max="99" '
        + 'value="' + cnt(g, +ctx) + '">' + t("times");
      actions += '<button class="btn" data-act="rmyear">' + t("remove_from").replace("{y}", String(yLabel(ctx))) + '</button>';
      var missing2: number[] = [];
      for (var ay2 = cy; ay2 >= 2000; ay2--) if (g.years.indexOf(ay2) === -1) missing2.push(ay2);
      var oldOpt2 = g.years.indexOf(0) === -1 ? '<option value="old">' + t("long_ago") + '</option>' : "";
      if (missing2.length || oldOpt2) {
        actions += '<select data-act="addyearsel" class="gold">'
          + '<option value="">' + t("add_year") + '</option>'
          + missing2.map(function (y) { return '<option value="' + y + '">' + y + '</option>'; }).join("")
          + oldOpt2
          + '</select>';
      }
    }
    actions += '<span class="sugwrap"><input class="platinput" data-act="plat" placeholder="' + t("platform") + '" '
      + 'value="' + (g.platform ? esc(g.platform) : "") + '"><div class="sug"></div></span>';
    actions += '<span class="sugwrap"><input class="platinput" data-act="src" placeholder="' + t("launcher") + '" '
      + 'value="' + (g.source ? esc(g.source) : "") + '"><div class="sug"></div></span>';
    actions += '<input class="platinput oldcnt" data-act="rel" type="number" min="1970" max="2030" placeholder="' + t("rel_ph") + '" '
      + 'value="' + (g.rel || "") + '" style="width:110px">';
    actions += '<input class="platinput" data-act="genres" placeholder="' + t("genres_ph") + '" '
      + 'value="' + (g.genres ? esc(g.genres) : "") + '" style="width:160px">';
    actions += '<span class="sugwrap"><input class="platinput" data-act="series" placeholder="' + t("series_ph") + '" '
      + 'value="' + (g.series ? esc(g.series) : "") + '" style="width:150px"><div class="sug"></div></span>';
    if (g.status === "done" || g.status === "dropped" || g.years.length) {
      actions += '<div class="rate" role="group">';
      for (var r = 1; r <= 5; r++) {
        actions += '<button class="star' + (g.rating && r <= g.rating ? " on" : "")
          + '" data-act="rate" data-v="' + r + '">★</button>';
      }
      actions += '</div>';
    }
    actions += '<textarea class="noteinput" data-act="note" placeholder="' + t("note_ph") + '">' + (g.note ? esc(g.note) : "") + '</textarea>';
    // возможные дубли: сравниваем названия без «шумовых» слов изданий
    var EDITION_WORDS = ["goty", "game", "of", "the", "year", "edition", "remastered", "remaster",
      "definitive", "complete", "deluxe", "enhanced", "directors", "director", "cut", "hd",
      "ultimate", "gold", "collection", "anniversary", "special", "legendary",
      "s", "re", "intergrade", "royal", "expanded"];
    var dupKey = function (name: string): string {
      return norm(name).split(" ").filter(function (w) {
        return EDITION_WORDS.indexOf(w) === -1;
      }).join(" ").trim();
    };
    var gk = dupKey(g.name);
    if (gk.length >= 4) {
      var isSequelTail = function (rem: string): boolean {
        // остаток из чисел/римских цифр = сиквел, а не издание
        return rem.split(" ").every(function (w) {
          return /^\d+$/.test(w) || /^[ivxlcdm]+$/.test(w);
        });
      };
      var cands = state.games.filter(function (o) {
        if (o.id === g.id) return false;
        if (g.series && o.series && g.series === o.series && dupKey(o.name) !== gk) return false; // одна серия — не дубль
        var ok = dupKey(o.name);
        if (ok.length < 4) return false;
        if (ok === gk) return true;
        var longK = ok.length > gk.length ? ok : gk, shortK = ok.length > gk.length ? gk : ok;
        if (longK.indexOf(shortK) !== 0) return false; // интересует только общий префикс
        var rem = longK.slice(shortK.length).trim();
        return rem !== "" && !isSequelTail(rem);
      }).slice(0, 2);
      var pairKey = function (a: number, b: number): string { return Math.min(a, b) + "-" + Math.max(a, b); };
      cands = cands.filter(function (o) { return state.noMerge!.indexOf(pairKey(g.id, o.id)) === -1; });
      cands.forEach(function (o) {
        if (mergeAsk && mergeAsk.id === g.id && mergeAsk.mid === o.id) {
          actions += '<span class="mchoose">' + t("merge_keep")
            + '<button class="btn gold" data-act="mergekeep" data-mid="' + o.id + '" data-keep="this">«' + esc(g.name) + '»</button>'
            + '<button class="btn gold" data-act="mergekeep" data-mid="' + o.id + '" data-keep="other">«' + esc(o.name) + '»</button>'
            + '<button class="btn" data-act="mergecancel">' + t("cancel") + '</button></span>';
        } else {
          actions += '<span class="mpair">'
            + '<button class="btn gold" data-act="mergeask" data-mid="' + o.id + '">'
            + t("merge_with").replace("{n}", esc(o.name)) + '</button>'
            + '<button class="btn nomerge" data-act="nomerge" data-mid="' + o.id + '" title="' + t("not_dupes") + '">✕</button></span>';
        }
      });
    }
    actions += '<button class="btn del" data-act="del">' + t("del") + '</button>';
  } // конец if(open) — закрытым карточкам панель действий не нужна

  var starsView = "";
  if (g.rating || g.cs) {
    starsView = '<div class="stars"' + (g.rating ? ' aria-label="' + t("rating_aria").replace("{r}", String(g.rating)) + '"' : '') + '>';
    if (g.rating) {
      for (var s = 1; s <= 5; s++) starsView += (s <= g.rating ? '★' : '<span class="off">★</span>');
    }
    if (g.cs) {
      var csCls = g.cs >= 80 ? "hi" : (g.cs >= 60 ? "mid" : "");
      starsView += '<span class="cs ' + csCls + '" title="' + t("cs_title") + '">' + g.cs + '</span>';
    }
    starsView += '</div>';
  }
  var metaParts: string[] = [];
  if (g.rel) metaParts.push(String(g.rel));
  if (g.genres) metaParts.push(esc(g.genres));
  if (g.time) {
    var h = g.time / 3600;
    metaParts.push('<span class="tp">⏱ ' + (h >= 1 ? Math.round(h) + t("h") : Math.round(g.time / 60) + t("min")) + '</span>');
  }
  var metaView = metaParts.length ? '<div class="meta">' + metaParts.join(" · ") + '</div>' : "";

  var chips = "";
  if (g.platform) chips += '<span class="plat">' + esc(g.platform) + '</span>';
  if (g.source) chips += '<span class="src">' + esc(g.source) + '</span>';
  if (g.series) chips += '<span class="ser" data-act="serfilter">❖ ' + esc(g.series) + '</span>';
  chips += histChip + noteChip;
  var chipsView = chips ? '<div class="chips">' + chips + '</div>' : "";

  return '<div class="card win ' + g.status + (open ? " open" : "") + '" data-id="' + g.id + '" data-ctx="' + (ctx === null ? "s" : ctx) + '">'
    + '<span class="cursor">▶</span>'
    + '<div class="row"><span class="name">' + esc(g.name) + '</span>'
    + (g.fav ? '<span class="favmark" title="⚑">⚑</span>' : "")
    + badge + '</div>'
    + chipsView
    + metaView
    + starsView
    + (open ? '<div class="actions">' + actions + '</div>' : "") + '</div>';
}

export function render(): void {
  var t0 = performance.now();
  var c = counts();
  document.getElementById("stPlaying")!.textContent = c.playing;
  document.getElementById("stBacklog")!.textContent = c.backlog;
  document.getElementById("stDone")!.textContent = c.done;

  var q = norm(query);
  var noData = query.trim().toLowerCase() === "#nodata";
  function matches(g: Game): boolean {
    if (noData) return !g.source && !g.genres && !g.cs;
    if (!q) return true;
    // строго по началу названия; плюс точное имя серии — для чипа ❖
    if (norm(g.name).indexOf(q) === 0) return true;
    return !!(g.series && norm(g.series) === q);
  }
  var bySearch = state.games.filter(matches);
  var shown = bySearch.filter(function (g) {
    if (filter === "fav") return !!g.fav;
    return filter === "all" || filter === "catalog" || g.status === filter;
  });

  // платформы и лончеры для подсказок: стандартные + те, что уже введены
  var plats: Record<string, 1> = {}, srcs: Record<string, 1> = {};
  COMMON_PLATFORMS.forEach(function (p) { plats[p] = 1; });
  COMMON_SOURCES.forEach(function (s) { srcs[s] = 1; });
  state.games.forEach(function (g) {
    if (g.platform) plats[g.platform] = 1;
    if (g.source) srcs[g.source] = 1;
  });
  document.getElementById("platformList")!.innerHTML =
    Object.keys(plats).map(function (p) { return '<option value="' + esc(p) + '">'; }).join("");
  document.getElementById("sourceList")!.innerHTML =
    Object.keys(srcs).map(function (s) { return '<option value="' + esc(s) + '">'; }).join("");

  var html = "";
  // сводка серии: если запрос совпадает с названием серии
  if (q && !noData) {
    var serGames = state.games.filter(function (g) { return g.series && norm(g.series) === q; });
    if (serGames.length > 1) {
      var runs = 0, doneN = 0;
      serGames.forEach(function (g) {
        g.years.forEach(function (y) { runs += cnt(g, y); });
        if (g.years.length) doneN++;
      });
      html += '<div class="sersum">❖ <b>' + esc(serGames[0].series!) + '</b> — '
        + '<span class="n">' + serGames.length + '</span>' + gamesWord(serGames.length) + ' · '
        + '<span class="n">' + doneN + '</span>' + t("ser_done") + ' · '
        + '<span class="n">' + runs + '</span>' + runsWord(runs) + '</div>';
    }
  }
  function section(key: string, title: string | number, items: Game[], ctx: number | null): string {
    if (!items.length) return "";
    items = sortItems(items);
    var col = !!state.collapsed[key];
    var extra = key === "backlog" ? '<button class="dice" data-dice aria-label="' + t("dice_aria") + '">🎲</button>' : "";
    return '<section class="sec">'
      + '<div class="yearhead' + (col ? ' col' : '') + '" data-key="' + key
      + '" role="button" tabindex="0" aria-expanded="' + (!col) + '">'
      + '<span class="caret">▾</span><b>' + title + '</b>'
      + '<span class="line"></span>' + extra + '<span class="cnt">' + items.length + '</span></div>'
      + (col ? "" : items.map(function (g) { return cardHTML(g, ctx); }).join(""))
      + '</section>';
  }
  var hasAnything = filter === "done" ? bySearch.some(function (g) { return g.years.length > 0; }) : shown.length;
  if (!hasAnything) {
    html = '<div class="empty">' + ((q || noData) ? t("empty_search") : t("empty")) + '</div>';
  } else if (filter === "done" || filter === "all") {
    // группировка: играю → беклог → пройдено по годам → брошено
    if (filter === "all") {
      html += section("playing", stLabel("playing"), shown.filter(function (g) { return g.status === "playing"; }), null);
      html += section("backlog", stLabel("backlog"), shown.filter(function (g) { return g.status === "backlog"; }), null);
      // отложенные — «вернусь позже», поэтому рядом с беклогом, а не с брошенными
      html += section("onhold", stLabel("onhold"), shown.filter(function (g) { return g.status === "onhold"; }), null);
    }
    // годовые группы: по истории прохождений, независимо от текущего статуса
    var years: Record<string, Game[]> = {};
    bySearch.forEach(function (g) {
      g.years.forEach(function (y) { (years[y] = years[y] || []).push(g); });
    });
    Object.keys(years)
      .sort(function (a, b) { return (+b) - (+a); })
      .forEach(function (y) {
        html += section("y" + y, stLabel("done") + " · " + yLabel(y), years[y], +y);
      });
    if (filter === "all") {
      html += section("dropped", stLabel("dropped"), shown.filter(function (g) { return g.status === "dropped"; }), null);
    }
  } else {
    if (filter === "backlog" && shown.length) {
      html += '<button class="dicebar" data-dice>' + t("dice_bar") + '</button>';
    }
    html += section(filter, filter === "catalog" ? t("tab_catalog") : (filter === "fav" ? t("tab_fav") : stLabel(filter)), shown, null);
  }
  document.getElementById("list")!.innerHTML = html;

  // «no Playnite data» chip: visible only while such games exist
  var chip = document.getElementById("nodataChip");
  if (chip) {
    var nd = state.games.filter(function (g) { return !g.source && !g.genres && !g.cs; }).length;
    (chip as any).hidden = !nd;
    if (nd) chip.textContent = "⚠ " + t("nodata_chip") + " · " + nd;
  }
  (window as any).__lastRenderMs = performance.now() - t0; // perf budget probe (§7)
}

/* ================= helpers ================= */
function scrollToCard(el: Element): void {
  // content-visibility даёт лишь оценочные высоты карточек за экраном,
  // поэтому корректируем позицию несколькими прыжками, пока размеры не устаканятся
  var tries = 0;
  (function step() {
    if (!el.isConnected) return;
    el.scrollIntoView({ block: "center" });
    if (++tries < 5) setTimeout(step, 90);
  })();
}

function renderKeepScroll(anchorEl: Element | null): void {
  var aid: string | null = null, actx: string | null = null, top = 0;
  if (anchorEl && (anchorEl as any).dataset) {
    aid = (anchorEl as any).dataset.id;
    actx = (anchorEl as any).dataset.ctx;
    top = anchorEl.getBoundingClientRect().top;
  }
  render();
  if (aid != null) {
    var el = document.querySelector('.card[data-id="' + aid + '"][data-ctx="' + actx + '"]');
    if (el) window.scrollBy(0, el.getBoundingClientRect().top - top);
  }
}

function siblingCard(card: Element): Element | null {
  var n = card.nextElementSibling;
  if (n && n.classList && n.classList.contains("card")) return n;
  var p = card.previousElementSibling;
  if (p && p.classList && p.classList.contains("card")) return p;
  return null;
}

function patchCardByKey(k: string | null): void {
  if (!k) return;
  var parts = k.split("@");
  var g = state.games.find(function (x) { return x.id === +parts[0]; });
  if (!g) return;
  var el = document.querySelector('.card[data-id="' + parts[0] + '"][data-ctx="' + parts[1] + '"]');
  if (!el) { render(); return; }
  var tmp = document.createElement("div");
  tmp.innerHTML = cardHTML(g, parts[1] === "s" ? null : +parts[1]);
  el.replaceWith(tmp.firstChild!);
}

function syncClearBtn(): void {
  (document.getElementById("clearSearch") as any).hidden = !(document.getElementById("search") as HTMLInputElement).value;
}

function scrollToResults(): void {
  var bar = document.querySelector(".bar.mainbar") as HTMLElement | null;
  if (!bar) return;
  var top = bar.offsetTop;
  if (window.scrollY > top) window.scrollTo(0, top); // поиск остаётся прилипшим, шапка не выезжает
}

function clearAnchor(): { id: string; ctx: string } | null {
  // первая карточка отфильтрованного списка — к ней вернёмся после очистки
  var c = document.querySelector("#list .card") as HTMLElement | null;
  return c ? { id: c.dataset.id!, ctx: c.dataset.ctx! } : null;
}

function restoreAnchor(a: { id: string; ctx: string } | null): void {
  if (!a) return;
  var el = document.querySelector('.card[data-id="' + a.id + '"][data-ctx="' + a.ctx + '"]')
    || document.querySelector('.card[data-id="' + a.id + '"]');
  if (el) scrollToCard(el);
}

function addGame(name: string): void {
  name = name.trim();
  if (!name) return;
  var n = norm(name);
  var dup = state.games.find(function (g) { return norm(g.name) === n; });
  if (dup) { toast("«" + dup.name + "» " + t("already") + " (" + stLabel(dup.status) + ")"); return; }
  state.games.unshift({ id: state.nextId++, name: name, status: "backlog", years: [], platform: null, rating: null });
  save();
  (document.getElementById("search") as HTMLInputElement).value = "";
  query = "";
  render();
  toast(t("added_backlog") + name);
}

/* ---- подсказки платформ и лончеров (работают и на Android) ---- */
function sugValues(kind: string): string[] {
  var set: Record<string, 1> = {};
  if (kind === "plat") COMMON_PLATFORMS.forEach(function (v) { set[v] = 1; });
  if (kind === "src") COMMON_SOURCES.forEach(function (v) { set[v] = 1; });
  state.games.forEach(function (g) {
    var v = kind === "plat" ? g.platform : (kind === "src" ? g.source : g.series);
    if (v) set[v] = 1;
  });
  return Object.keys(set);
}

/* ---- справочник платформ/лончеров: канонизация свободного ввода ----
   Список значений не хранится отдельно — он и есть sugValues(): уникальные
   значения из самих игр плюс стартовый набор. */
function normSpace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function levenshtein(a: string, b: string): number {
  var m = a.length, n = b.length;
  if (Math.abs(m - n) > 2) return 99; // дальше 2 нас не интересует
  var prev: number[] = [], cur: number[] = [];
  for (var j = 0; j <= n; j++) prev[j] = j;
  for (var i = 1; i <= m; i++) {
    cur = [i];
    for (var k = 1; k <= n; k++) {
      cur[k] = Math.min(prev[k] + 1, cur[k - 1] + 1, prev[k - 1] + (a[i - 1] === b[k - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

// нормализовать ввод и свести к каноническому написанию из справочника;
// новое значение заводится только после подтверждения, отказ => prev
function resolveRef(kind: "plat" | "src", raw: string, prev: string | null): string | null {
  var val = normSpace(raw);
  if (!val) return null;
  var values = sugValues(kind);
  var low = val.toLowerCase();
  for (var i = 0; i < values.length; i++) {
    if (values[i].toLowerCase() === low) return values[i]; // опечатка регистра — канон побеждает
  }
  var best: string | null = null, bestD = 3;
  values.forEach(function (v) {
    var d = levenshtein(low, v.toLowerCase());
    if (d < bestD) { bestD = d; best = v; }
  });
  var limit = val.length >= 4 ? 2 : 1; // короткие строки — только 1 правка
  if (best && bestD <= limit) {
    if (confirm(t("ref_similar").replace("{v}", best))) return best;
  }
  if (confirm(t(kind === "plat" ? "ref_new_plat" : "ref_new_src").replace("{v}", val))) return val;
  return prev; // отказ от создания — откат к прежнему значению
}

function fillSug(input: HTMLInputElement): void {
  var kind = input.dataset.act;
  if (kind !== "plat" && kind !== "src" && kind !== "series") return;
  var box = input.parentElement!.querySelector(".sug");
  if (!box) return;
  var q = input.value.trim().toLowerCase();
  var vals = sugValues(kind).filter(function (v) {
    return v.toLowerCase() !== q && (!q || v.toLowerCase().indexOf(q) !== -1);
  }).slice(0, 12);
  box.innerHTML = vals.map(function (v) {
    return '<button type="button" class="sugbtn" data-sug="' + esc(v) + '">' + esc(v) + '</button>';
  }).join("");
}

/* ================= events ================= */
var lastDice: number | null = null;
var searchTimer: any = null;

// roll over an explicit pool; the tap handler is swappable (smart-dice window)
export function rollDice(pool: Game[]): boolean {
  if (!pool.length) { toast(t("dice_none")); return false; }
  var pick;
  do { pick = pool[Math.floor(Math.random() * pool.length)]; }
  while (pool.length > 1 && pick.id === lastDice);
  lastDice = pick.id;
  state.collapsed["backlog"] = false;
  openId = pick.id + "@s";
  render();
  var el = document.querySelector('.card[data-id="' + pick.id + '"][data-ctx="s"]');
  if (el) {
    el.classList.add("chosen");
    scrollToCard(el);
  }
  toast(t("dice_pick") + "«" + pick.name + "»");
  return true;
}

var diceTapHandler: () => void = function () {
  rollDice(state.games.filter(function (g) { return g.status === "backlog"; }));
};
export function setDiceHandler(fn: () => void): void {
  diceTapHandler = fn;
}

export function wireUI(): void {
  document.getElementById("tabs")!.addEventListener("click", function (e: any) {
    var tb = e.target.closest(".tab");
    if (!tb) return;
    if (tb.id === "nodataChip") {
      // filter shortcut, not a tab: run the #nodata search
      (document.getElementById("search") as HTMLInputElement).value = "#nodata";
      query = "#nodata";
      syncClearBtn();
      render();
      scrollToResults();
      return;
    }
    filter = tb.dataset.f;
    openId = null;
    document.querySelectorAll(".tab").forEach(function (x) { x.classList.toggle("active", x === tb); });
    render();
  });

  document.getElementById("search")!.addEventListener("input", function (e: any) {
    syncClearBtn();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      var wasQ = query, nowQ = e.target.value;
      var a = (wasQ && !nowQ.trim()) ? clearAnchor() : null;
      query = nowQ;
      render();
      if (nowQ.trim()) scrollToResults(); // результаты с первой игры, шапка скрыта
      else restoreAnchor(a);
    }, 150);
  });
  document.getElementById("clearSearch")!.addEventListener("click", function () {
    var inp = document.getElementById("search") as HTMLInputElement;
    var a = query ? clearAnchor() : null;
    inp.value = "";
    query = "";
    syncClearBtn();
    render();
    restoreAnchor(a);
    inp.focus();
  });

  document.getElementById("addBtn")!.addEventListener("click", function () {
    var v = (document.getElementById("search") as HTMLInputElement).value.trim();
    if (!v) v = (prompt(t("prompt_name")) || "").trim();
    if (v) addGame(v);
  });
  document.getElementById("search")!.addEventListener("keydown", function (e: any) {
    if (e.key === "Enter") e.target.blur(); // просто закрыть клавиатуру, поиск уже отработал
  });

  var list = document.getElementById("list")!;
  list.addEventListener("focusin", function (e: any) {
    var a = e.target.dataset && e.target.dataset.act;
    if (a === "plat" || a === "src" || a === "series") fillSug(e.target);
  });
  list.addEventListener("input", function (e: any) {
    var a = e.target.dataset && e.target.dataset.act;
    if (a === "plat" || a === "src" || a === "series") fillSug(e.target);
  });
  list.addEventListener("mousedown", function (e: any) {
    var b = e.target.closest(".sugbtn");
    if (!b) return;
    e.preventDefault(); // не даём инпуту потерять фокус до клика
  });
  list.addEventListener("click", function (e: any) {
    var b = e.target.closest(".sugbtn");
    if (!b) return;
    var input = b.closest(".sugwrap").querySelector("input");
    var card = b.closest(".card");
    var g = state.games.find(function (x) { return x.id === +card.dataset.id; });
    if (!g) return;
    if (input.dataset.act === "plat") g.platform = b.dataset.sug;
    else if (input.dataset.act === "series") g.series = b.dataset.sug;
    else g.source = b.dataset.sug;
    save();
    render();
  });

  list.addEventListener("click", function (e: any) {
    if (e.target.closest(".sugbtn")) return; // suggestion taps are handled above and must not toggle the card
    var dice = e.target.closest("[data-dice]");
    if (dice) {
      diceTapHandler();
      return;
    }
    var head = e.target.closest(".yearhead");
    if (head) {
      var k = head.dataset.key;
      var willCollapse = !state.collapsed[k];
      state.collapsed[k] = willCollapse;
      save();
      render();
      if (willCollapse) {
        var h = document.querySelector('.yearhead[data-key="' + k + '"]');
        if (h) h.scrollIntoView({ block: "nearest" });
      }
      return;
    }
    var card = e.target.closest(".card");
    if (!card) return;
    var id = +card.dataset.id;
    var ctxRaw = card.dataset.ctx;
    var ctx = ctxRaw === "s" ? null : +ctxRaw;
    var key = id + "@" + ctxRaw;
    var g = state.games.find(function (x) { return x.id === id; });
    if (!g) return;
    var act = e.target.dataset.act;
    var cy = new Date().getFullYear();
    if (act === "serfilter") {
      query = g.series!;
      (document.getElementById("search") as HTMLInputElement).value = g.series!;
      syncClearBtn();
      render();
      scrollToResults();
      return;
    }
    if (!act) {
      if (e.target.closest("input,select,textarea")) return; // поля ввода не сворачивают карточку
      var prev = openId;
      openId = (openId === key ? null : key);
      mergeAsk = null;
      patchCardByKey(prev);
      if (openId && openId !== prev) patchCardByKey(openId);
      return;
    }
    if (act === "status") {
      var s = e.target.dataset.s;
      g.status = s;
      if (s === "done") addYear(g, e.target.dataset.old ? 0 : cy);
      // историю прохождений при смене статуса НЕ трогаем
      var anchor2 = siblingCard(card);
      save();
      renderKeepScroll(anchor2);
      return;
    }
    if (act === "addyear") {
      addYear(g, cy);
      if (g.status === "backlog") g.status = "done";
      save();
      render();
      toast("«" + g.name + "» " + t("added_to") + cy);
      return;
    }
    if (act === "rmyear") {
      g.years = g.years.filter(function (y) { return y !== ctx; });
      if (g.counts) delete g.counts[ctx as number];
      if (!g.years.length && g.status === "done") {
        g.status = "backlog";
        toast(t("no_runs_left"));
      }
      openId = null;
      save();
      render();
      return;
    }
    if (act === "fav") {
      g.fav = !g.fav;
      save();
      render();
      return;
    }
    if (act === "rate") {
      var v = +e.target.dataset.v;
      g.rating = (g.rating === v ? null : v);
      save();
      render();
      return;
    }
    if (act === "mergeask") {
      mergeAsk = { id: g.id, mid: +e.target.dataset.mid };
      render();
      return;
    }
    if (act === "mergecancel") {
      mergeAsk = null;
      render();
      return;
    }
    if (act === "nomerge") {
      var oid = +e.target.dataset.mid;
      var pk = Math.min(g.id, oid) + "-" + Math.max(g.id, oid);
      if (state.noMerge!.indexOf(pk) === -1) state.noMerge!.push(pk);
      mergeAsk = null;
      save();
      render();
      toast(t("nomerge_done"));
      return;
    }
    if (act === "mergekeep") {
      var other = state.games.find(function (x) { return x.id === +e.target.dataset.mid; });
      if (!other) return;
      var keep = e.target.dataset.keep === "this" ? g : other;
      var absorb = keep === g ? other : g;
      // годы и счётчики
      absorb.years.forEach(function (y) { addYear(keep, y); });
      if (absorb.counts) {
        keep.counts = keep.counts || {};
        for (var ck in absorb.counts) {
          if ((absorb.counts[ck as any] || 1) > (keep.counts[ck as any] || 1)) keep.counts[ck as any] = absorb.counts[ck as any];
        }
      }
      // статус: берём более «продвинутый»
      var rank: any = { backlog: 0, dropped: 1, onhold: 2, playing: 3, done: 4 };
      if (rank[absorb.status] > rank[keep.status]) keep.status = absorb.status;
      // поля: у остающейся приоритет, пустоты добираем у второй
      ["platform", "source", "genres", "rel", "cs", "rating", "series"].forEach(function (k) {
        if (!(keep as any)[k] && (absorb as any)[k]) (keep as any)[k] = (absorb as any)[k];
      });
      if ((absorb.time || 0) > (keep.time || 0)) keep.time = absorb.time;
      if (absorb.fav) keep.fav = true;
      if (absorb.note) keep.note = keep.note ? (keep.note + "\n" + absorb.note) : absorb.note;
      state.games = state.games.filter(function (x) { return x.id !== absorb.id; });
      // чистим записи noMerge с удалённым id
      state.noMerge = state.noMerge!.filter(function (pk2) {
        return pk2.split("-").indexOf(String(absorb.id)) === -1;
      });
      mergeAsk = null;
      openId = null;
      save();
      render();
      toast(t("merged") + "«" + keep.name + "»");
      return;
    }
    if (act === "del") {
      if (confirm(t("confirm_del").replace("{n}", g.name))) {
        state.games = state.games.filter(function (x) { return x.id !== id; });
        openId = null;
        save();
        render();
      }
      return;
    }
  });

  list.addEventListener("keydown", function (e: any) {
    var head = e.target.closest ? e.target.closest(".yearhead") : null;
    if (head && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      state.collapsed[head.dataset.key] = !state.collapsed[head.dataset.key];
      save();
      render();
    }
  });

  list.addEventListener("change", function (e: any) {
    var act = e.target.dataset.act;
    if (["year", "plat", "src", "oldcount", "addyearsel", "note", "rel", "genres", "series", "rename"].indexOf(act) === -1) return;
    var card = e.target.closest(".card");
    var g = state.games.find(function (x) { return x.id === +card.dataset.id; });
    if (!g) return;
    if (act === "rename") {
      var nn = e.target.value.trim();
      if (!nn) { render(); return; } // пустое имя — откат
      var clash = state.games.find(function (x) { return x.id !== g!.id && norm(x.name) === norm(nn); });
      if (clash) { toast("«" + clash.name + "» " + t("already") + " (" + stLabel(clash.status) + ")"); render(); return; }
      g.name = nn;
      save();
      render();
    }
    else if (act === "note") { g.note = e.target.value.trim() || null; save(); render(); }
    else if (act === "year") {
      var oldY = card.dataset.ctx === "s" ? null : +card.dataset.ctx;
      var newY = +e.target.value;
      if (oldY !== null) {
        g.years = g.years.filter(function (y) { return y !== oldY; });
        addYear(g, newY);
        if (g.counts && g.counts[oldY]) {
          var mv = g.counts[oldY];
          delete g.counts[oldY];
          if (mv > (g.counts[newY] || 1)) g.counts[newY] = mv;
        }
        openId = g.id + "@" + newY;
      }
      save();
      render();
    }
    else if (act === "oldcount") {
      var cy2 = +card.dataset.ctx;
      var v2 = Math.max(1, Math.min(99, parseInt(e.target.value, 10) || 1));
      g.counts = g.counts || {};
      if (v2 > 1) g.counts[cy2] = v2; else delete g.counts[cy2];
      save();
      render();
    }
    else if (act === "addyearsel") {
      var raw = e.target.value;
      if (raw) {
        var v = raw === "old" ? 0 : +raw;
        addYear(g, v);
        var pc = card.querySelector('[data-role=precount]');
        var pcv = pc ? Math.max(1, Math.min(99, parseInt(pc.value, 10) || 1)) : 1;
        if (pcv > 1) { g.counts = g.counts || {}; g.counts[v] = pcv; }
        if (g.status === "backlog" || g.status === "playing") g.status = "done";
        var anchor = siblingCard(card);
        save();
        renderKeepScroll(anchor);
        toast("«" + g.name + "» " + t("added_to") + yLabel(v) + (pcv > 1 ? " ×" + pcv : ""));
      }
    }
    else if (act === "plat") { g.platform = resolveRef("plat", e.target.value, g.platform || null); save(); render(); }
    else if (act === "rel") { var rv = parseInt(e.target.value, 10); g.rel = (rv >= 1970 && rv <= 2030) ? rv : null; save(); render(); }
    else if (act === "genres") { g.genres = e.target.value.trim() || null; save(); render(); }
    else if (act === "series") { g.series = e.target.value.trim() || null; save(); render(); }
    else { g.source = resolveRef("src", e.target.value, g.source || null); save(); render(); }
  });

  document.getElementById("sortSel")!.addEventListener("change", function (e: any) {
    sortMode = e.target.value;
    try { localStorage.setItem(SORTKEY, sortMode); } catch (err) {}
    render();
  });
  document.getElementById("resetNoMergeBtn")!.addEventListener("click", function () {
    state.noMerge = [];
    save();
    render();
    refreshNoMergeBtn();
    toast(t("nomerge_reset"));
  });
  document.getElementById("langSel")!.addEventListener("change", function (e: any) {
    setLang(e.target.value);
    applyLang();
  });
}

/* ================= язык ================= */
// extra translation passes from other modules (results screen etc.)
export var langHooks: Array<() => void> = [];

export function refreshNoMergeBtn(): void {
  var b = document.getElementById("resetNoMergeBtn")!;
  var n = (state.noMerge || []).length;
  (b as any).hidden = !n;
  b.textContent = t("reset_nomerge") + " (" + n + ")";
}

export function applyLang(): void {
  document.documentElement.lang = lang;
  document.querySelector("h1")!.textContent = t("title");
  document.title = t("title");
  document.querySelector(".subtitle")!.textContent = t("subtitle");
  var statSpans = document.querySelectorAll(".stat span");
  statSpans[0].textContent = t("stat_playing");
  statSpans[1].textContent = t("stat_backlog");
  statSpans[2].textContent = t("stat_done");
  document.querySelectorAll(".tab").forEach(function (tb: any) {
    var f = tb.dataset.f;
    tb.textContent = f === "all" ? t("tab_all") : (f === "catalog" ? t("tab_catalog") : (f === "fav" ? t("tab_fav") : stLabel(f)));
  });
  (document.getElementById("search") as HTMLInputElement).placeholder = t("search_ph");
  document.getElementById("addBtn")!.textContent = t("add_btn");
  document.getElementById("gearBtn")!.setAttribute("aria-label", t("settings_aria"));
  (document.getElementById("gsUrl") as HTMLInputElement).placeholder = t("ph_gs");
  document.getElementById("orGist")!.textContent = t("or_gist");
  (document.getElementById("ghToken") as HTMLInputElement).placeholder = t("ph_token");
  (document.getElementById("ghGist") as HTMLInputElement).placeholder = t("ph_gist");
  document.getElementById("syncConnect")!.textContent = t("connect");
  document.getElementById("syncOff")!.textContent = t("disconnect");
  document.getElementById("csvBtn")!.textContent = t("csv");
  document.getElementById("bakBtn")!.textContent = t("backup");
  document.getElementById("resBtn")!.textContent = t("restore");
  document.getElementById("setTitle")!.textContent = t("set_title");
  document.getElementById("setClose")!.setAttribute("aria-label", t("res_close"));
  document.getElementById("langLbl")!.textContent = t("lbl_lang");
  document.getElementById("themeLbl")!.textContent = t("lbl_theme");
  document.getElementById("syncSpoilerLbl")!.textContent = t("sync_spoiler");
  document.getElementById("syncHelpBtn")!.setAttribute("aria-label", t("sync_help_aria"));
  document.getElementById("helpWhat")!.textContent = t("help_what");
  document.getElementById("helpGoogle")!.textContent = t("help_google");
  document.getElementById("helpGh")!.textContent = t("help_gh");
  document.getElementById("playniteHead")!.textContent = t("head_playnite");
  document.getElementById("dataHead")!.textContent = t("head_data");
  refreshNoMergeBtn();
  var ss = document.getElementById("sortSel") as HTMLSelectElement;
  ss.innerHTML = ["default", "name", "cs", "rating", "rel", "time"].map(function (m) {
    return '<option value="' + m + '">' + t("sort_" + m) + '</option>';
  }).join("");
  ss.value = sortMode;
  (document.getElementById("langSel") as HTMLSelectElement).value = lang;
  render();
  langHooks.forEach(function (fn) { fn(); });
}
