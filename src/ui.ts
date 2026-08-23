// Rendering + all list/chrome interaction.
// Redesign: compact rows / card tiles, expandable FF sub-window with a
// view mode (quick actions only) and an explicit edit mode («Изменить»).
import type { Game } from "./types";
import {
  state, save, cnt, addYear, yLabel,
  STATUS_KEYS, COMMON_PLATFORMS, COMMON_SOURCES
} from "./data";
import { t, stLabel, lang, setLang, gamesWord, runsWord } from "./i18n";
import { esc, norm, toast } from "./util";

/* ================= ui state ================= */
export var filter = "all", query = "", openId: string | null = null, mergeAsk: any = null;
var editKey: string | null = null;          // card in edit mode (always === openId)
var editPendingStatus: string | null = null; // status picked in the edit form, applied on save
var armDelKey: string | null = null;        // delete button waits for the confirming tap
var armDelTimer: any = null;
var noteEditKey: string | null = null;      // quick note editor (📝) open on this card
var animKey: string | null = null;          // play the open animation only for a REAL open,
                                            // not for in-place detail updates (📝, «Изменить»)
var SORTKEY = "gamelog-sort";
var sortMode = "default";
try { sortMode = localStorage.getItem(SORTKEY) || "default"; } catch (e) {}
var VIEWKEY = "gamelog-view";
var viewMode = "list"; // list | cards — device-local, «Играю» is always cards
try { viewMode = localStorage.getItem(VIEWKEY) === "cards" ? "cards" : "list"; } catch (e) {}

export function setOpenId(v: string | null): void { openId = v; }

function sortItems(arr: Game[]): Game[] {
  if (sortMode === "default") return arr;
  var c = arr.slice();
  if (sortMode === "name") c.sort(function (a, b) { return a.name.localeCompare(b.name, undefined, { sensitivity: "base" }); });
  else c.sort(function (a, b) { return ((b as any)[sortMode] || 0) - ((a as any)[sortMode] || 0); }); // числовые — по убыванию, пустые в конец
  return c;
}

/* ================= render ================= */
// waving swallowtail flag, fills with currentColor (theme-aware)
export var FLAG_SVG = '<svg class="flagicon" viewBox="2334 4108 3832 2785" width="15" height="15" aria-hidden="true" fill="currentColor">'
  + '<path d="M2813.99 4497.59c4.83,214.58 234.66,1056.27 275.43,1370.1 81.11,-14.56 237.26,-99.17 324.97,-129.76 256.21,-89.36 499.55,-123.51 777.71,-118.29 158.01,2.97 277.77,36.65 418.96,49.95 -1.23,-113.13 -140.32,-1261.39 -190.7,-1300.86 -15.17,-11.88 -139.92,-47.33 -167.62,-54.44 -242.87,-62.36 -524.73,-62.44 -776.87,-21.56 -310.96,50.42 -406.42,112 -661.89,204.86zm1746.96 1252.39c-53.6,-33.17 -325.84,-62.02 -402.96,-48.28 10.76,67.15 46.1,234.57 75.7,282.57 46.66,-14.96 314.51,-205.13 327.26,-234.29zm-1378.61 1004.86c-2.63,-125.2 -226.8,-1115.11 -272.83,-1361.5 -43.23,-231.38 -93.27,-439.65 -140.65,-681.41 -73.67,-375.89 -5,-161.25 3.28,-323.69 6.19,-121.57 -106.04,-203.35 -226.91,-161.72 -94.44,32.52 -147.8,177.38 -54.95,267.08 62.59,60.48 58.13,20.02 79.56,126.5l452.48 2164.37 160.03 -29.62zm1395.5 -2021.5c-2.56,157.58 42.2,354.94 59.99,517.34 16.83,153.58 68.09,353.61 63.16,499.29 -63.87,59.87 -367.14,247.3 -397.43,305.56 185.21,142.17 697.67,145.95 966.79,92.43 396.91,-78.94 493.65,-182.08 787.72,-335.66 -18.73,-63.99 -487.54,-407.77 -575.97,-462.02 23.98,-200.03 377.74,-675.42 416.02,-888.89 -51.33,11.65 -202.97,102.67 -266.63,130.08 -384.26,165.43 -632.25,176.67 -1053.65,141.88z"/>'
  + '</svg>';


// toolbar view-toggle icons (currentColor, theme-aware)
var ICON_LIST = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">'
  + '<rect x="3" y="5" width="18" height="2.6" rx="1"/><rect x="3" y="10.7" width="18" height="2.6" rx="1"/>'
  + '<rect x="3" y="16.4" width="18" height="2.6" rx="1"/></svg>';
var ICON_GRID = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">'
  + '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/>'
  + '<rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>';

// кнопка вида: иконка ЦЕЛЕВОГО режима (что будет по тапу)
function refreshViewBtn(): void {
  var vb = document.getElementById("viewBtn")!;
  var target = viewMode === "cards" ? "view_list" : "view_cards";
  vb.innerHTML = viewMode === "cards" ? ICON_LIST : ICON_GRID;
  vb.setAttribute("aria-label", t("view_aria"));
  vb.setAttribute("title", t(target));
}

// кнопка сортировки подсвечена, пока активна не «Без сортировки»
function refreshSortCtl(): void {
  var c = document.getElementById("sortCtl");
  if (c) c.classList.toggle("on", sortMode !== "default");
}

function counts() {
  var c: any = { playing: 0, backlog: 0, done: 0, dropped: 0, onhold: 0 };
  state.games.forEach(function (g) { c[g.status]++; });
  return c;
}

function coverColor(name: string): string {
  var h = 0;
  for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return "linear-gradient(165deg,hsl(" + h + " 40% 36%),hsl(" + ((h + 40) % 360) + " 55% 12%))";
}

// VT323 digits + a small system-font unit («41 ч» — units aren't in the pixel font)
function fmtTime(sec: number): string {
  var h = sec / 3600;
  return h >= 1
    ? Math.round(h) + '<span class="unit">' + t("h") + '</span>'
    : Math.round(sec / 60) + '<span class="unit">' + t("min") + '</span>';
}

function badgeHTML(g: Game, ctx: number | null): string {
  if (ctx !== null) {
    var cc = cnt(g, +ctx);
    var mult = cc > 1 ? " ×" + cc : "";
    return '<span class="badge done">' + stLabel("done") + ' · ' + yLabel(ctx) + mult + '</span>';
  }
  return '<span class="badge ' + g.status + '">' + stLabel(g.status) + '</span>';
}

function historyText(g: Game): string {
  return g.years.map(function (y) {
    var yc = cnt(g, +y);
    return (+y === 0 ? t("ago_short") : y) + (yc > 1 ? "×" + yc : "");
  }).join(", ");
}

function csChip(g: Game): string {
  if (!g.cs) return "";
  var csCls = g.cs >= 80 ? "hi" : (g.cs >= 60 ? "mid" : "");
  return '<span class="cs ' + csCls + '" title="' + t("cs_title") + '">' + g.cs + '</span>';
}

function starsStatic(g: Game): string {
  if (!g.rating && !g.cs) return "";
  var out = '<span class="stars"' + (g.rating ? ' aria-label="' + t("rating_aria").replace("{r}", String(g.rating)) + '"' : '') + '>';
  if (g.rating) {
    for (var s = 1; s <= 5; s++) out += (s <= g.rating ? '★' : '<span class="off">★</span>');
  }
  out += '</span>';
  return out + csChip(g);
}

// «+ Прошёл в…» quick action (view mode), with the ×N multiplier in status ctx
function addYearSelHTML(g: Game, ctx: number | null): string {
  var cy = new Date().getFullYear();
  var missing: number[] = [];
  for (var ay = cy; ay >= 2000; ay--) if (g.years.indexOf(ay) === -1) missing.push(ay);
  var oldOpt = g.years.indexOf(0) === -1 ? '<option value="old">' + t("long_ago") + '</option>' : "";
  if (!missing.length && !oldOpt) return "";
  var sel = '<select data-act="addyearsel" class="gold">'
    + '<option value="">' + t("add_year") + '</option>'
    + missing.map(function (y) { return '<option value="' + y + '">' + y + '</option>'; }).join("")
    + oldOpt
    + '</select>';
  if (ctx !== null) return sel;
  return '<span class="mpair">' + sel
    + '<span class="xmark">×</span>'
    + '<input class="input oldcnt" data-role="precount" type="number" min="1" max="99" value="1" title="' + t("times").trim() + '">'
    + '<span class="unit">' + t("times") + '</span>'
    + '</span>';
}

// duplicate-merge suggestions (view mode) — names compared without edition noise
function mergeHTML(g: Game): string {
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
  if (gk.length < 4) return "";
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
  var out = "";
  cands.forEach(function (o) {
    if (mergeAsk && mergeAsk.id === g.id && mergeAsk.mid === o.id) {
      out += '<span class="mchoose">' + t("merge_keep")
        + '<button class="btn gold" data-act="mergekeep" data-mid="' + o.id + '" data-keep="this">«' + esc(g.name) + '»</button>'
        + '<button class="btn gold" data-act="mergekeep" data-mid="' + o.id + '" data-keep="other">«' + esc(o.name) + '»</button>'
        + '<button class="btn" data-act="mergecancel">' + t("cancel") + '</button></span>';
    } else {
      out += '<span class="mpair">'
        + '<button class="btn gold" data-act="mergeask" data-mid="' + o.id + '">'
        + t("merge_with").replace("{n}", esc(o.name)) + '</button>'
        + '<button class="btn nomerge" data-act="nomerge" data-mid="' + o.id + '" title="' + t("not_dupes") + '">✕</button></span>';
    }
  });
  return out;
}

function fieldHTML(label: string, valueHTML: string, cls?: string): string {
  return '<div class="field' + (cls ? " " + cls : "") + '"><span class="flabel">' + label + '</span>'
    + '<div class="fval' + (cls === "num" ? " num" : "") + '">' + valueHTML + '</div></div>';
}

/* ---- expanded sub-window: view mode ---- */
function detailViewHTML(g: Game, ctx: number | null, key: string): string {
  var d = '<div class="detail' + (animKey === key ? " anim" : "") + '">';
  d += '<div class="dhead"><h4 class="dname">' + esc(g.name) + '</h4>'
    // быстрое добавление заметки: 📝 виден, пока заметки нет
    + (!g.note ? '<button class="iconbtn" data-act="noteadd" aria-label="' + t("lbl_note") + '">📝</button>' : '')
    + '<button class="iconbtn favtop' + (g.fav ? " on" : "") + '" data-act="fav" aria-label="'
    + (g.fav ? t("fav_off") : t("fav_on")) + '">' + FLAG_SVG + '</button>'
    + '<button class="iconbtn" data-act="close" aria-label="' + t("res_close") + '">✕</button></div>';

  d += '<div class="fields">';
  d += '<div class="field"><span class="flabel">' + t("lbl_status") + '</span>'
    + '<div class="fval">' + badgeHTML(g, ctx) + '</div></div>';
  if (g.years.length) {
    d += fieldHTML(t("lbl_history"), "✓ " + historyText(g));
  }
  d += fieldHTML(t("platform"), g.platform ? esc(g.platform) : "—");
  d += fieldHTML(t("launcher"), g.source ? esc(g.source) : "—");
  d += fieldHTML(t("genres_ph"), g.genres ? esc(g.genres) : "—");
  d += '<div class="field"><span class="flabel">' + t("rel_ph") + '</span>'
    + '<div class="fval num">' + (g.rel || "—") + '</div></div>';
  if (g.time) {
    d += '<div class="field"><span class="flabel">' + t("lbl_time") + '</span>'
      + '<div class="fval num">' + fmtTime(g.time) + '</div></div>';
  }
  d += fieldHTML(t("series_ph"), g.series ? esc(g.series) : "—");
  // rating: interactive stars stay a one-tap quick action (core test);
  // community score lives under its own label — it is not the user's rating
  if (g.status === "done" || g.status === "dropped" || g.years.length) {
    var rateH = '<div class="rate" role="group">';
    for (var r = 1; r <= 5; r++) {
      rateH += '<button class="star' + (g.rating && r <= g.rating ? " on" : "")
        + '" data-act="rate" data-v="' + r + '">★</button>';
    }
    rateH += '</div>';
    d += '<div class="field"><span class="flabel">' + t("lbl_rating") + '</span>'
      + '<div class="fval">' + rateH + '</div></div>';
  }
  if (g.cs) {
    d += '<div class="field"><span class="flabel">' + t("lbl_cs") + '</span>'
      + '<div class="fval">' + csChip(g) + '</div></div>';
  }
  if (g.note) {
    d += fieldHTML(t("lbl_note"), '<span class="prewrap">' + esc(g.note) + '</span>', "fwide");
  }
  d += '</div>'; // .fields

  var quick = addYearSelHTML(g, ctx);
  if (quick) d += '<div class="qrow">' + quick + '</div>';
  var mg = mergeHTML(g);
  if (mg) d += '<div class="qrow">' + mg + '</div>';
  // поле новой заметки открывается по 📝 внизу карточки, без режима «Изменить»
  if (noteEditKey === key) {
    d += '<div class="qrow"><textarea class="textarea" data-act="notequick" placeholder="'
      + t("note_ph") + '"></textarea></div>';
  }

  var armed = armDelKey === key;
  d += '<div class="commands">'
    + '<button class="cmd cmd--primary" data-act="edit">' + t("edit") + '</button>'
    + '<button class="cmd cmd--danger' + (armed ? " armed" : "") + '" data-act="del">'
    + (armed ? t("del_sure") : t("del")) + '</button>'
    + '</div>';
  return d + '</div>';
}

/* ---- expanded sub-window: edit mode ---- */
function editFormHTML(g: Game, ctx: number | null): string {
  var cy = new Date().getFullYear();
  var d = '<div class="detail editing">';
  d += '<div class="dhead"><h4 class="dname">' + esc(g.name) + '</h4></div>';
  d += '<div class="fields">';
  d += '<div class="field fwide"><span class="flabel">' + t("name_ph") + '</span>'
    + '<input class="input" data-ed="name" value="' + esc(g.name) + '"></div>';
  if (ctx === null) {
    var pick = STATUS_KEYS.filter(function (s) { return s !== "done"; })
      .map(function (s) {
        return '<button class="opt" data-act="picks" data-s="' + s + '" aria-pressed="'
          + (s === (editPendingStatus || g.status)) + '">' + stLabel(s) + '</button>';
      }).join("");
    d += '<div class="field fwide"><span class="flabel">' + t("lbl_status") + '</span>'
      + '<div class="status-pick">' + pick + '</div></div>';
  } else {
    var yearOpts = '<option value="0"' + (+ctx === 0 ? " selected" : "") + '>' + t("long_ago") + '</option>';
    for (var y = cy + 1; y >= 2000; y--) {
      yearOpts += '<option value="' + y + '"' + (+ctx === y ? " selected" : "") + '>' + y + '</option>';
    }
    d += '<div class="field fwide"><span class="flabel">' + stLabel("done") + '</span>'
      + '<div class="qrow" style="margin-top:0">'
      + '<select data-ed="year">' + yearOpts + '</select>'
      + '<input class="input oldcnt" data-ed="oldcount" type="number" min="1" max="99" value="' + cnt(g, +ctx) + '">'
      + '<span class="unit">' + t("times") + '</span>'
      + '<button class="btn" data-act="rmyear">' + t("remove_from").replace("{y}", String(yLabel(ctx))) + '</button>'
      + '</div></div>';
  }
  d += '<div class="field"><span class="flabel">' + t("platform") + '</span>'
    + '<span class="sugwrap"><input class="input" data-ed="plat" value="'
    + (g.platform ? esc(g.platform) : "") + '"><div class="sug"></div></span></div>';
  d += '<div class="field"><span class="flabel">' + t("launcher") + '</span>'
    + '<span class="sugwrap"><input class="input" data-ed="src" value="'
    + (g.source ? esc(g.source) : "") + '"><div class="sug"></div></span></div>';
  d += '<div class="field"><span class="flabel">' + t("genres_ph") + '</span>'
    + '<input class="input" data-ed="genres" value="' + (g.genres ? esc(g.genres) : "") + '"></div>';
  d += '<div class="field"><span class="flabel">' + t("rel_ph") + '</span>'
    + '<input class="input relinput" data-ed="rel" type="number" min="1970" max="2030" value="' + (g.rel || "") + '"></div>';
  d += '<div class="field"><span class="flabel">' + t("series_ph") + '</span>'
    + '<span class="sugwrap"><input class="input" data-ed="series" value="'
    + (g.series ? esc(g.series) : "") + '"><div class="sug"></div></span></div>';
  d += '<div class="field fwide"><span class="flabel">' + t("lbl_note") + '</span>'
    + '<textarea class="textarea" data-ed="note" placeholder="' + t("note_ph") + '">'
    + (g.note ? esc(g.note) : "") + '</textarea></div>';
  d += '</div>'; // .fields
  d += '<div class="commands">'
    + '<button class="cmd" data-act="canceledit">' + t("cancel") + '</button>'
    + '<button class="cmd cmd--primary" data-act="saveedit">' + t("save") + '</button>'
    + '</div>';
  return d + '</div>';
}

function detailHTML(g: Game, ctx: number | null, key: string): string {
  return editKey === key ? editFormHTML(g, ctx) : detailViewHTML(g, ctx, key);
}

function dcellHTML(g: Game, ctx: number | null, key: string): string {
  var ctxs = ctx === null ? "s" : String(ctx);
  return '<div class="dcell" data-id="' + g.id + '" data-ctx="' + ctxs + '">'
    + detailHTML(g, ctx, key) + '</div>';
}

// вставить .dcell после КОНЦА РЯДА тайла: в 2 колонки — после соседа справа
function insertDcellAfterRow(tileEl: Element, html: string): void {
  var cardsBox = tileEl.parentElement!;
  var kids = Array.prototype.filter.call(cardsBox.children, function (n: Element) {
    return n.classList.contains("card");
  });
  var idx = kids.indexOf(tileEl);
  var cols = typeof matchMedia !== "undefined" && matchMedia("(min-width:640px)").matches ? 2 : 1;
  var end = Math.min(idx + (cols === 2 && idx % 2 === 0 ? 1 : 0), kids.length - 1);
  (kids[end] as Element).insertAdjacentHTML("afterend", html);
}

/* ---- list row / card tile ---- */
function cardHTML(g: Game, ctx: number | null, kind: string): string {
  // ctx: null — карточка в секции статуса; число — экземпляр в группе года (0 = Давно)
  var key = g.id + "@" + (ctx === null ? "s" : ctx);
  var open = key === openId;
  var ctxs = ctx === null ? "s" : String(ctx);

  if (kind === "tile") {
    var metaParts: string[] = [];
    if (g.platform) metaParts.push(esc(g.platform));
    if (g.genres) metaParts.push(esc(g.genres));
    if (g.rel) metaParts.push(String(g.rel));
    var glyph = (g.name.trim()[0] || "?").toUpperCase();
    return '<div class="card tile win ' + g.status + (open ? " open" : "") + '" data-id="' + g.id + '" data-ctx="' + ctxs + '">'
      + '<span class="cursor">▼</span>'
      + '<div class="cmain" role="button" tabindex="0" aria-expanded="' + open + '">'
      + '<div class="cover" style="background:' + coverColor(g.name) + '">' + esc(glyph) + '</div>'
      + '<div class="cbody">'
      + '<div class="namerow"><h3 class="name">' + esc(g.name) + '</h3>'
      + (g.fav ? '<span class="favmark" title="' + t("tab_fav") + '">' + FLAG_SVG + '</span>' : "")
      + '</div>'
      + (metaParts.length ? '<div class="cmeta">' + metaParts.join(" · ") + '</div>' : "")
      + '<div class="cfoot">' + badgeHTML(g, ctx)
      + (g.time ? '<span class="tp">⏱ ' + fmtTime(g.time) + '</span>' : "")
      + starsStatic(g)
      + '</div>'
      + '</div></div>'
      + '</div>';
    // раскрытие тайла живёт ОТДЕЛЬНОЙ полноширинной ячейкой сетки (.dcell),
    // чтобы сосед по ряду не растягивался — см. section()
  }

  var rowMetaParts: string[] = [];
  if (g.platform) rowMetaParts.push(esc(g.platform));
  if (g.genres) rowMetaParts.push(esc(g.genres.split(",")[0].trim()));
  if (g.rel) rowMetaParts.push(String(g.rel));
  // в годовой группе перепрохождения видны прямо в строке
  var xmult = ctx !== null && cnt(g, +ctx) > 1 ? '<span class="xmult">×' + cnt(g, +ctx) + '</span>' : "";
  return '<div class="card rowv ' + g.status + (open ? " open" : "") + '" data-id="' + g.id + '" data-ctx="' + ctxs + '">'
    + '<div class="cmain" role="button" tabindex="0" aria-expanded="' + open + '">'
    + '<span class="cursor">▶</span>'
    + '<span class="name">' + esc(g.name) + '</span>'
    + (g.fav ? '<span class="favmark" title="' + t("tab_fav") + '">' + FLAG_SVG + '</span>' : "")
    + (g.series ? '<button class="micser" data-act="serfilter" title="❖ ' + esc(g.series) + '">❖</button>' : "")
    + (g.note ? '<span class="micnote">📝</span>' : "")
    + xmult
    + csChip(g)
    + (g.rating ? '<span class="rowstars">' + "★".repeat(g.rating) + '</span>' : "")
    + (rowMetaParts.length ? '<span class="rowmeta">' + rowMetaParts.join(" · ") + '</span>' : "")
    + '<span class="chev">' + (open ? "▲" : "▾") + '</span>'
    + '</div>'
    + (open ? detailHTML(g, ctx, key) : "")
    + '</div>';
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
  function section(key: string, title: string | number, items: Game[], ctx: number | null, kind: string): string {
    if (!items.length) return "";
    items = sortItems(items);
    var col = !!state.collapsed[key];
    var extra = key === "backlog" ? '<button class="dice" data-dice aria-label="' + t("dice_aria") + '">🎲</button>' : "";
    var body = "";
    if (!col) {
      if (kind === "tile") {
        // раскрытие тайла — полноширинная ячейка ПОД его рядом: сосед по ряду
        // не растягивается, окно занимает ширину обеих колонок
        var ctxs2 = ctx === null ? "s" : String(ctx);
        var openIdx = -1;
        items.forEach(function (g, i) { if (g.id + "@" + ctxs2 === openId) openIdx = i; });
        var cols = typeof matchMedia !== "undefined" && matchMedia("(min-width:640px)").matches ? 2 : 1;
        var dIdx = openIdx < 0 ? -1
          : Math.min(openIdx + (cols === 2 && openIdx % 2 === 0 ? 1 : 0), items.length - 1);
        var inner = "";
        items.forEach(function (g, i) {
          inner += cardHTML(g, ctx, "tile");
          if (i === dIdx && openIdx >= 0) {
            inner += dcellHTML(items[openIdx], ctx, openId!);
          }
        });
        body = '<div class="cards">' + inner + '</div>';
      } else {
        body = '<div class="win panel">'
          + items.map(function (g) { return cardHTML(g, ctx, kind); }).join("") + '</div>';
      }
    }
    return '<section class="sec">'
      + '<div class="yearhead' + (col ? ' col' : '') + '" data-key="' + key
      + '" role="button" tabindex="0" aria-expanded="' + (!col) + '">'
      + '<span class="caret">▾</span><b>' + title + '</b>'
      + '<span class="line"></span>' + extra + '<span class="cnt">' + items.length + '</span></div>'
      + body
      + '</section>';
  }
  // «Играю» — всегда карточки-витрина; остальные секции по переключателю вида
  var restKind = viewMode === "cards" ? "tile" : "rowv";
  var hasAnything = filter === "done" ? bySearch.some(function (g) { return g.years.length > 0; }) : shown.length;
  if (!hasAnything) {
    html = '<div class="empty">' + ((q || noData) ? t("empty_search") : t("empty")) + '</div>';
  } else if (filter === "done" || filter === "all") {
    // группировка: играю → беклог → пройдено по годам → брошено
    if (filter === "all") {
      html += section("playing", stLabel("playing"), shown.filter(function (g) { return g.status === "playing"; }), null, "tile");
      html += section("backlog", stLabel("backlog"), shown.filter(function (g) { return g.status === "backlog"; }), null, restKind);
      // отложенные — «вернусь позже», поэтому рядом с беклогом, а не с брошенными
      html += section("onhold", stLabel("onhold"), shown.filter(function (g) { return g.status === "onhold"; }), null, restKind);
    }
    // годовые группы: по истории прохождений, независимо от текущего статуса
    var years: Record<string, Game[]> = {};
    bySearch.forEach(function (g) {
      g.years.forEach(function (y) { (years[y] = years[y] || []).push(g); });
    });
    Object.keys(years)
      .sort(function (a, b) { return (+b) - (+a); })
      .forEach(function (y) {
        html += section("y" + y, stLabel("done") + " · " + yLabel(y), years[y], +y, restKind);
      });
    if (filter === "all") {
      html += section("dropped", stLabel("dropped"), shown.filter(function (g) { return g.status === "dropped"; }), null, restKind);
    }
  } else {
    if (filter === "backlog" && shown.length) {
      html += '<button class="dicebar" data-dice>' + t("dice_bar") + '</button>';
    }
    var kind = filter === "playing" ? "tile" : restKind;
    html += section(filter, filter === "catalog" ? t("tab_catalog") : (filter === "fav" ? t("tab_fav") : stLabel(filter)), shown, null, kind);
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
  var ctx = parts[1] === "s" ? null : +parts[1];
  if (el.classList.contains("tile")) {
    // хирургический патч тайла: классы + вставка/удаление .dcell БЕЗ полного
    // рендера — innerHTML-перерендер сбрасывал content-visibility-высоты
    // и список уплывал при переключении соседних карточек
    var open = k === openId;
    el.classList.toggle("open", open);
    var cm = el.querySelector(".cmain");
    if (cm) cm.setAttribute("aria-expanded", String(open));
    var d = document.querySelector('.dcell[data-id="' + parts[0] + '"][data-ctx="' + parts[1] + '"]');
    if (open) {
      if (d) d.innerHTML = detailHTML(g, ctx, k);
      else insertDcellAfterRow(el, dcellHTML(g, ctx, k));
    } else if (d) {
      d.remove();
    }
    return;
  }
  var tmp = document.createElement("div");
  tmp.innerHTML = cardHTML(g, ctx, "rowv");
  el.replaceWith(tmp.firstChild!);
}

function stopEdit(): string | null {
  // discard unsaved form state; returns the card key to repaint
  var k = editKey;
  editKey = null;
  editPendingStatus = null;
  return k;
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
  var kind = input.dataset.ed;
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
  stopEdit();
  openId = pick.id + "@s";
  animKey = openId;
  render();
  animKey = null;
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

// applies the edit form of card `cardEl` to game g; returns false if invalid
function commitEdit(cardEl: HTMLElement, g: Game, ctx: number | null): boolean {
  var read = function (name: string): HTMLInputElement | null {
    return cardEl.querySelector('[data-ed="' + name + '"]') as HTMLInputElement | null;
  };
  var nameInp = read("name");
  if (nameInp) {
    var nn = nameInp.value.trim();
    if (nn && norm(nn) !== norm(g.name)) {
      var clash = state.games.find(function (x) { return x.id !== g.id && norm(x.name) === norm(nn); });
      if (clash) {
        toast("«" + clash.name + "» " + t("already") + " (" + stLabel(clash.status) + ")");
        return false; // остаёмся в форме — имя не принято
      }
    }
    if (nn) g.name = nn;
  }
  var platInp = read("plat");
  if (platInp) g.platform = resolveRef("plat", platInp.value, g.platform || null);
  var srcInp = read("src");
  if (srcInp) g.source = resolveRef("src", srcInp.value, g.source || null);
  var genresInp = read("genres");
  if (genresInp) g.genres = genresInp.value.trim() || null;
  var relInp = read("rel");
  if (relInp) {
    var rv = parseInt(relInp.value, 10);
    g.rel = (rv >= 1970 && rv <= 2030) ? rv : null;
  }
  var serInp = read("series");
  if (serInp) g.series = serInp.value.trim() || null;
  var noteInp = read("note");
  if (noteInp) g.note = noteInp.value.trim() || null;

  if (ctx === null) {
    if (editPendingStatus && editPendingStatus !== g.status) g.status = editPendingStatus as any;
  } else {
    // счётчик прохождений этого года
    var cntInp = read("oldcount");
    if (cntInp) {
      var v2 = Math.max(1, Math.min(99, parseInt(cntInp.value, 10) || 1));
      g.counts = g.counts || {};
      if (v2 > 1) g.counts[+ctx] = v2; else delete g.counts[+ctx];
    }
    // перенос прохождения в другой год — вместе со счётчиком
    var yearSel = read("year");
    if (yearSel) {
      var newY = +yearSel.value;
      if (newY !== +ctx) {
        g.years = g.years.filter(function (y) { return y !== +ctx; });
        addYear(g, newY);
        if (g.counts && g.counts[+ctx]) {
          var mv = g.counts[+ctx];
          delete g.counts[+ctx];
          if (mv > (g.counts[newY] || 1)) g.counts[newY] = mv;
        }
        openId = g.id + "@" + newY;
      }
    }
  }
  return true;
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
    stopEdit();
    noteEditKey = null;
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
  document.getElementById("viewBtn")!.addEventListener("click", function () {
    viewMode = viewMode === "list" ? "cards" : "list";
    try { localStorage.setItem(VIEWKEY, viewMode); } catch (err) {}
    refreshViewBtn();
    render();
  });

  var list = document.getElementById("list")!;
  list.addEventListener("focusin", function (e: any) {
    var a = e.target.dataset && e.target.dataset.ed;
    if (a === "plat" || a === "src" || a === "series") fillSug(e.target);
  });
  list.addEventListener("input", function (e: any) {
    var a = e.target.dataset && e.target.dataset.ed;
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
    // подсказка только заполняет поле формы; в данные значение попадёт при «Сохранить»
    var input = b.closest(".sugwrap").querySelector("input");
    input.value = b.dataset.sug;
    fillSug(input);
    input.focus();
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
    var card = e.target.closest(".card,.dcell"); // detail тайла живёт в .dcell рядом с карточкой
    if (!card) return;
    var id = +card.dataset.id;
    var ctxRaw = card.dataset.ctx;
    var ctx = ctxRaw === "s" ? null : +ctxRaw;
    var key = id + "@" + ctxRaw;
    var g = state.games.find(function (x) { return x.id === id; });
    if (!g) return;
    var act = e.target.closest("[data-act]") ? e.target.closest("[data-act]").dataset.act : null;
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
      if (editKey === key) return; // тап по фону формы не выбрасывает из редактирования
      var prevEdit = stopEdit(); // редактирование другой карточки — сбросить
      var prev = openId;
      openId = (openId === key ? null : key);
      mergeAsk = null;
      armDelKey = null;
      noteEditKey = null;
      // якорь скролла — ТА карточка, по которой тапнули: закрытие чужого
      // раскрытия выше не должно утаскивать список из-под пальца
      var anchorEl: Element = card;
      if (card.classList.contains("dcell")) {
        anchorEl = document.querySelector('.card[data-id="' + id + '"][data-ctx="' + ctxRaw + '"]') || card;
      }
      var topBefore = anchorEl.getBoundingClientRect().top;
      var clickedEl: Element | null = card.classList.contains("dcell")
        ? document.querySelector('.card[data-id="' + id + '"][data-ctx="' + ctxRaw + '"]')
        : card;
      var prevEl: Element | null = null;
      if (prev && prev !== key) {
        var pq = prev.split("@");
        prevEl = document.querySelector('.card[data-id="' + pq[0] + '"][data-ctx="' + pq[1] + '"]');
      }
      if (openId && prevEl && prevEl.classList.contains("tile")
        && clickedEl && clickedEl.classList.contains("tile")) {
        // переключение между раскрытыми тайлами: окно переиспользуется —
        // контент меняется на месте БЕЗ анимации раскрытия, золотая
        // обводка переходит к активной карточке
        prevEl.classList.remove("open");
        var pcm = prevEl.querySelector(".cmain");
        if (pcm) pcm.setAttribute("aria-expanded", "false");
        clickedEl.classList.add("open");
        var ccm = clickedEl.querySelector(".cmain");
        if (ccm) ccm.setAttribute("aria-expanded", "true");
        var dOld = document.querySelector(".dcell") as HTMLElement | null;
        if (dOld) {
          dOld.dataset.id = String(id);
          dOld.dataset.ctx = ctxRaw;
          // позиция окна: сразу после конца ряда активного тайла
          var cardsBox2 = clickedEl.parentElement!;
          var kids2 = Array.prototype.filter.call(cardsBox2.children, function (n: Element) {
            return n.classList.contains("card");
          });
          var idx2 = kids2.indexOf(clickedEl);
          var cols2 = typeof matchMedia !== "undefined" && matchMedia("(min-width:640px)").matches ? 2 : 1;
          var endEl = kids2[Math.min(idx2 + (cols2 === 2 && idx2 % 2 === 0 ? 1 : 0), kids2.length - 1)] as Element;
          if (dOld.previousElementSibling !== endEl) endEl.insertAdjacentElement("afterend", dOld);
          dOld.innerHTML = detailHTML(g, ctx, key);
        } else {
          insertDcellAfterRow(clickedEl, dcellHTML(g, ctx, key));
        }
      } else {
        animKey = openId; // настоящее открытие — единственный случай с анимацией
        if (prevEdit && prevEdit !== prev) patchCardByKey(prevEdit);
        patchCardByKey(prev);
        if (openId && openId !== prev) patchCardByKey(openId);
        animKey = null;
      }
      var after = document.querySelector('.card[data-id="' + id + '"][data-ctx="' + ctxRaw + '"]');
      if (after) window.scrollBy(0, after.getBoundingClientRect().top - topBefore);
      // открытие у нижнего края: довернуть страницу, чтобы окно раскрытия
      // было видно, но верх карточки не ушёл под sticky-бар
      if (after && openId === key) {
        var dEl: Element | null = after.classList.contains("tile")
          ? document.querySelector('.dcell[data-id="' + id + '"][data-ctx="' + ctxRaw + '"]')
          : after;
        if (dEl) {
          var over = dEl.getBoundingClientRect().bottom - window.innerHeight + 12;
          var room = after.getBoundingClientRect().top - 84; // sticky-бар + заголовок ряда
          var needScroll = Math.min(over, room);
          if (needScroll > 0) {
            var smooth = !(typeof matchMedia !== "undefined"
              && matchMedia("(prefers-reduced-motion: reduce)").matches);
            window.scrollBy({ top: needScroll, behavior: smooth ? "smooth" : "auto" } as any);
          }
        }
      }
      return;
    }
    if (act === "close") {
      stopEdit();
      openId = null;
      mergeAsk = null;
      armDelKey = null;
      noteEditKey = null;
      patchCardByKey(key);
      return;
    }
    if (act === "edit") {
      editKey = key;
      editPendingStatus = g.status;
      armDelKey = null;
      noteEditKey = null;
      patchCardByKey(key);
      return;
    }
    if (act === "noteadd") {
      if (noteEditKey !== key) { // повторный тап не пересоздаёт поле и не стирает текст
        noteEditKey = key;
        patchCardByKey(key);
      }
      var ta = document.querySelector('textarea[data-act="notequick"]') as HTMLTextAreaElement | null;
      if (ta) ta.focus();
      return;
    }
    if (act === "canceledit") {
      stopEdit();
      patchCardByKey(key);
      return;
    }
    if (act === "saveedit") {
      if (!commitEdit(card, g, ctx)) return; // невалидное имя — остаёмся в форме
      stopEdit();
      save();
      render();
      return;
    }
    if (act === "picks") {
      var pickBtn = e.target.closest(".opt");
      editPendingStatus = pickBtn.dataset.s;
      card.querySelectorAll(".opt").forEach(function (o: any) {
        o.setAttribute("aria-pressed", String(o === pickBtn));
      });
      return;
    }
    if (act === "rmyear") {
      g.years = g.years.filter(function (y) { return y !== ctx; });
      if (g.counts) delete g.counts[ctx as number];
      if (!g.years.length && g.status === "done") {
        g.status = "backlog";
        toast(t("no_runs_left"));
      }
      stopEdit();
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
      var v = +e.target.closest("[data-act]").dataset.v;
      g.rating = (g.rating === v ? null : v);
      save();
      render();
      return;
    }
    if (act === "mergeask") {
      mergeAsk = { id: g.id, mid: +e.target.closest("[data-act]").dataset.mid };
      render();
      return;
    }
    if (act === "mergecancel") {
      mergeAsk = null;
      render();
      return;
    }
    if (act === "nomerge") {
      var oid = +e.target.closest("[data-act]").dataset.mid;
      var pk = Math.min(g.id, oid) + "-" + Math.max(g.id, oid);
      if (state.noMerge!.indexOf(pk) === -1) state.noMerge!.push(pk);
      mergeAsk = null;
      save();
      render();
      toast(t("nomerge_done"));
      return;
    }
    if (act === "mergekeep") {
      var mbtn = e.target.closest("[data-act]");
      var other = state.games.find(function (x) { return x.id === +mbtn.dataset.mid; });
      if (!other) return;
      var keep = mbtn.dataset.keep === "this" ? g : other;
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
      // двухтапное подтверждение в стиле FF: «Удалить» → «Точно?»
      if (armDelKey === key) {
        clearTimeout(armDelTimer);
        armDelKey = null;
        state.games = state.games.filter(function (x) { return x.id !== id; });
        openId = null;
        save();
        render();
        return;
      }
      armDelKey = key;
      clearTimeout(armDelTimer);
      armDelTimer = setTimeout(function () {
        if (armDelKey === key) {
          armDelKey = null;
          patchCardByKey(key);
        }
      }, 2500);
      patchCardByKey(key);
      return;
    }
  });

  list.addEventListener("keydown", function (e: any) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var head = e.target.closest ? e.target.closest(".yearhead") : null;
    if (head) {
      e.preventDefault();
      state.collapsed[head.dataset.key] = !state.collapsed[head.dataset.key];
      save();
      render();
      return;
    }
    var main = e.target.classList && e.target.classList.contains("cmain") ? e.target : null;
    if (main && e.key === "Enter") {
      e.preventDefault();
      main.click(); // раскрытие/сворачивание с клавиатуры
    }
  });

  // быстрые действия со сменой данных: «+ Прошёл в…» и новая заметка по 📝
  list.addEventListener("change", function (e: any) {
    var act = e.target.dataset.act;
    if (act === "notequick") {
      var ncard = e.target.closest(".card,.dcell");
      var ng = state.games.find(function (x) { return x.id === +ncard.dataset.id; });
      if (!ng) return;
      ng.note = e.target.value.trim() || null;
      noteEditKey = null;
      save();
      render();
      return;
    }
    if (act !== "addyearsel") return;
    var card = e.target.closest(".card,.dcell");
    var g = state.games.find(function (x) { return x.id === +card.dataset.id; });
    if (!g) return;
    var raw = e.target.value;
    if (!raw) return;
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
  });

  // Esc: сначала выходим из формы, затем закрываем раскрытие;
  // оверлеи (итоги/кубик/настройки) обрабатывают Esc сами
  document.addEventListener("keydown", function (e: any) {
    if (e.key !== "Escape") return;
    var overlays = ["resultsWin", "settingsWin", "diceWin"];
    for (var i = 0; i < overlays.length; i++) {
      var w = document.getElementById(overlays[i]) as any;
      if (w && !w.hidden) return;
    }
    if (editKey) {
      var k = stopEdit();
      patchCardByKey(k);
    } else if (noteEditKey) {
      var nk = noteEditKey;
      noteEditKey = null;
      patchCardByKey(nk);
    } else if (openId) {
      var p = openId;
      openId = null;
      armDelKey = null;
      mergeAsk = null;
      patchCardByKey(p);
    }
  });

  // смена числа колонок карточной сетки двигает .dcell — перерисовать
  try {
    matchMedia("(min-width:640px)").addEventListener("change", function () { render(); });
  } catch (e) {}

  document.getElementById("sortSel")!.addEventListener("change", function (e: any) {
    sortMode = e.target.value;
    try { localStorage.setItem(SORTKEY, sortMode); } catch (err) {}
    refreshSortCtl();
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
  var statSpans = document.querySelectorAll(".stat span");
  statSpans[0].textContent = t("stat_playing");
  statSpans[1].textContent = t("stat_backlog");
  statSpans[2].textContent = t("stat_done");
  document.querySelectorAll(".tab").forEach(function (tb: any) {
    var f = tb.dataset.f;
    if (!f) return; // nodata-чип живёт по своим правилам в render()
    if (f === "all") { tb.setAttribute("aria-label", t("tab_all_aria")); return; } // внутри — SVG-домик
    if (f === "fav") { tb.innerHTML = FLAG_SVG + " " + t("tab_fav"); return; }
    tb.textContent = f === "catalog" ? t("tab_catalog") : stLabel(f);
  });
  (document.getElementById("search") as HTMLInputElement).placeholder = t("search_ph");
  var ab = document.getElementById("addBtn")!;
  ab.setAttribute("aria-label", t("add_btn")); // внутри — пиксельный «плюс», текст только в подсказке
  ab.setAttribute("title", t("add_btn"));
  refreshViewBtn();
  refreshSortCtl();
  document.getElementById("sortSel")!.setAttribute("aria-label", t("sort_aria"));
  document.getElementById("gearBtn")!.setAttribute("aria-label", t("settings_aria"));
  document.getElementById("resultsBtn")!.setAttribute("aria-label", t("res_btn_aria"));
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
