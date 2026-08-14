// Playnite CSV import (§3 overwrite rules) + JSON backup/restore.
import type { Game, State } from "./types";
import { state, replaceState, migrate, save, addYear, cleanPlat } from "./data";
import { t } from "./i18n";
import { toast, norm } from "./util";
import { render, setOpenId } from "./ui";
import { canFS, fileHandle, setFileHandle, setFStatus, writeToFile } from "./sync";

/* ================= CSV import (Playnite) ================= */
export function parseCSV(text: string): string[][] {
  text = text.replace(/^﻿/, "");
  // определяем разделитель по первой строке
  var firstLine = text.slice(0, text.indexOf("\n"));
  var delim = firstLine.split(";").length > firstLine.split(",").length ? ";" : ",";
  var rows: string[][] = [], row: string[] = [], cur = "", inQ = false;
  for (var i = 0; i < text.length; i++) {
    var ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === delim) { row.push(cur); cur = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(cur); cur = "";
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
      } else cur += ch;
    }
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

export function mapStatus(s: string): Game["status"] {
  s = (s || "").toLowerCase();
  if (/beaten|completed|пройден|заверш/.test(s)) return "done";
  if (/^playing|играю/.test(s)) return "playing";
  if (/abandon|брошен/.test(s)) return "dropped";
  if (/on\s*hold|отложен/.test(s)) return "onhold";
  return "backlog"; // Not Played, Plan to Play и всё прочее
}

function importCSVText(text: string): void {
  var rows = parseCSV(text);
  if (rows.length < 2) { toast(t("imp_none")); return; }
  var head = rows[0].map(function (h) { return h.trim().toLowerCase(); });
  var iName = -1, iStatus = -1, iPlat = -1, iScore = -1, iSrc = -1, iGen = -1, iRel = -1, iTime = -1, iComm = -1, iSer = -1, iFav = -1;
  head.forEach(function (h, i) {
    if (iName === -1 && /^(name|название|game|title|игра)$/.test(h)) iName = i;
    if (iStatus === -1 && /completion|статус прохожд/.test(h)) iStatus = i;
    if (iPlat === -1 && /^(platform|platforms|платформа|платформы)$/.test(h)) iPlat = i;
    if (iScore === -1 && /user\s*score|оценка/.test(h)) iScore = i;
    if (iSrc === -1 && /^(source|sources|library|источник|лончер|библиотека)$/.test(h)) iSrc = i;
    if (iGen === -1 && /^(genres|genre|жанры|жанр)$/.test(h)) iGen = i;
    if (iRel === -1 && /^release\s*date$/.test(h)) iRel = i;
    if (iTime === -1 && /^time\s*played$/.test(h)) iTime = i;
    if (iComm === -1 && /^community\s*score$/.test(h)) iComm = i;
    if (iSer === -1 && /^(series|серия)$/.test(h)) iSer = i;
    if (iFav === -1 && /^(favorite|избранное)$/.test(h)) iFav = i;
  });
  if (iName === -1) { toast(t("imp_nocol")); return; }
  var existing: Record<string, Game> = {};
  state.games.forEach(function (g) { existing[norm(g.name)] = g; });
  var added = 0, updated = 0;
  for (var i = 1; i < rows.length; i++) {
    var name = (rows[i][iName] || "").trim();
    if (!name) continue;
    var st = iStatus > -1 ? mapStatus(rows[i][iStatus]) : "backlog";
    var plat = iPlat > -1 ? cleanPlat((rows[i][iPlat] || "").split(/[,;]/)[0]) : "";
    var src = iSrc > -1 ? (rows[i][iSrc] || "").trim() : "Playnite"; // игра из CSV точно есть в библиотеке
    var genres = iGen > -1 ? (rows[i][iGen] || "").split(",").slice(0, 2).map(function (x) { return x.trim(); }).filter(Boolean).join(", ") : "";
    var rel = 0;
    if (iRel > -1) { var rm = (rows[i][iRel] || "").match(/(19|20)\d{2}/); if (rm) rel = +rm[0]; }
    var tsec = iTime > -1 ? (parseInt(rows[i][iTime], 10) || 0) : 0;
    var cs = iComm > -1 ? (parseInt(rows[i][iComm], 10) || 0) : 0;
    var ser = iSer > -1 ? (rows[i][iSer] || "").split(",")[0].trim() : "";
    var fav = iFav > -1 && /^true$/i.test((rows[i][iFav] || "").trim());
    var rating: number | null = null;
    if (iScore > -1) {
      var sc = parseFloat(rows[i][iScore]);
      if (!isNaN(sc) && sc > 0) rating = Math.max(1, Math.min(5, Math.round(sc / 20)));
    }
    var key = norm(name);
    if (existing[key]) {
      // не трогаем то, что уже размечено вручную; статус подтягиваем только из беклога вверх
      var g = existing[key];
      if (g.status === "backlog" && st !== "backlog") {
        g.status = st;
        if (st === "done") addYear(g, 0); // год неизвестен — «Давно»
        updated++;
      }
      if (!g.platform && plat) g.platform = plat;
      if (!g.rating && rating) g.rating = rating;
      if ((!g.source || g.source === "Playnite") && src) g.source = src; // заглушку уточняем настоящим лончером
      if (!g.genres && genres) g.genres = genres;
      if (!g.rel && rel) g.rel = rel;
      if (tsec > (g.time || 0)) g.time = tsec; // наигранное время только растёт
      if (cs) g.cs = cs; // народная оценка — всегда свежая из CSV
      if (ser) g.series = ser; // серия — приоритет у Playnite
      if (fav) g.fav = true; // избранное из Playnite добавляет, но не снимает
    } else {
      var ng: Game = {
        id: state.nextId++, name: name, status: st,
        years: st === "done" ? [0] : [], // импортированные прохождения — в «Давно»
        platform: plat || null, rating: rating, source: src || null,
        genres: genres || null, rel: rel || null, time: tsec || null, cs: cs || null,
        series: ser || null, fav: fav || undefined
      };
      state.games.push(ng);
      existing[key] = ng;
      added++;
    }
  }
  save();
  render();
  toast(t("imp_done") + added + (updated ? t("imp_upd") + updated : ""));
}

/* ================= файл данных: сохранить / открыть ================= */
function applyLoaded(p: State, srcName: string): void {
  if (!p || !Array.isArray(p.games)) throw new Error(t("bad_format"));
  replaceState(migrate(p));
  setOpenId(null);
  render();
  toast(t("restored") + srcName + ": " + p.games.length + t("games_w"));
}

function downloadJSON(): void {
  var blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "game-log.json";
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  toast(t("bak_done"));
}

export function wireImporter(): void {
  document.getElementById("csvBtn")!.addEventListener("click", function () {
    document.getElementById("csvFile")!.click();
  });
  document.getElementById("csvFile")!.addEventListener("change", function (e: any) {
    var f = e.target.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try { importCSVText(r.result as string); }
      catch (err: any) { toast(t("imp_fail") + err.message); }
      e.target.value = "";
    };
    r.readAsText(f);
  });

  document.getElementById("bakBtn")!.addEventListener("click", function () {
    if (fileHandle) { writeToFile(); toast(t("bak_done")); return; }
    if (canFS()) {
      (window as any).showSaveFilePicker({
        suggestedName: "game-log.json",
        types: [{ description: t("file_desc"), accept: { "application/json": [".json"] } }]
      }).then(function (h: any) {
        setFileHandle(h);
        setFStatus(h.name);
        writeToFile();
        toast(t("bak_done"));
      }).catch(function (err: any) {
        if (err && err.name === "AbortError") return;
        downloadJSON();
      });
      return;
    }
    downloadJSON();
  });

  document.getElementById("resBtn")!.addEventListener("click", function () {
    if (canFS() && typeof (window as any).showOpenFilePicker === "function") {
      (window as any).showOpenFilePicker({
        types: [{ description: t("file_desc"), accept: { "application/json": [".json"] } }]
      }).then(function (hs: any) {
        var h = hs[0];
        return h.getFile().then(function (f: File) { return f.text(); }).then(function (txt: string) {
          applyLoaded(JSON.parse(txt), h.name);
          setFileHandle(h);
          setFStatus(h.name);
        });
      }).catch(function (err: any) {
        if (err && err.name === "AbortError") return;
        toast(t("not_backup") + err.message);
      });
      return;
    }
    document.getElementById("jsonFile")!.click();
  });
  document.getElementById("jsonFile")!.addEventListener("change", function (e: any) {
    var f = e.target.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try { applyLoaded(JSON.parse(r.result as string), f.name); }
      catch (err: any) { toast(t("not_backup") + err.message); }
      e.target.value = "";
    };
    r.readAsText(f);
  });
}
