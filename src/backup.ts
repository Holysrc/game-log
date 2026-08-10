// Daily local auto-backup: one snapshot per calendar day on first open,
// keep the 5 most recent. Device-local (localStorage), never synced.
// Rolling back bumps updatedAt via save() so the restored state wins
// over remote like any ordinary edit.
import type { State } from "./types";
import { state, replaceState, migrate, save } from "./data";
import { t, gamesWord } from "./i18n";
import { toast } from "./util";
import { render, setOpenId } from "./ui";

var PREFIX = "gamelog-bak-";
var PRERESTORE = PREFIX + "prerestore";
var KEEP = 5;

function todayKey(): string {
  var d = new Date();
  return PREFIX + d.getFullYear()
    + "-" + ("0" + (d.getMonth() + 1)).slice(-2)
    + "-" + ("0" + d.getDate()).slice(-2);
}

function backupKeys(): string[] {
  var keys: string[] = [];
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(PREFIX) === 0 && k !== PRERESTORE) keys.push(k);
    }
  } catch (e) {}
  return keys.sort().reverse(); // ISO dates: newest first
}

function prune(): void {
  backupKeys().slice(KEEP).forEach(function (k) {
    try { localStorage.removeItem(k); } catch (e) {}
  });
}

export function initAutoBackup(): void {
  if (!state.games.length) return; // empty profile — nothing worth saving
  var key = todayKey();
  try {
    if (localStorage.getItem(key)) { prune(); return; } // already have today's
    localStorage.setItem(key, JSON.stringify(state));
  } catch (e) {
    // quota: drop the oldest snapshot and retry once
    var keys = backupKeys();
    if (keys.length) {
      try {
        localStorage.removeItem(keys[keys.length - 1]);
        localStorage.setItem(key, JSON.stringify(state));
      } catch (e2) {}
    }
  }
  prune();
}

function label(k: string): string {
  if (k === PRERESTORE) return t("bak_prerestore");
  return k.slice(PREFIX.length);
}

function readSnapshot(k: string): State | null {
  try {
    var p = JSON.parse(localStorage.getItem(k) || "");
    if (p && Array.isArray(p.games)) return p;
  } catch (e) {}
  return null;
}

export function refreshBackupUI(): void {
  var sel = document.getElementById("bakSel") as HTMLSelectElement;
  if (!sel) return;
  var keys = backupKeys();
  var pre = readSnapshot(PRERESTORE) ? [PRERESTORE] : [];
  var all = keys.concat(pre);
  sel.innerHTML = '<option value="">' + t("bak_auto") + " (" + all.length + ")</option>"
    + all.map(function (k) {
      var snap = readSnapshot(k);
      var n = snap ? snap.games.length : 0;
      return '<option value="' + k + '">' + label(k) + " · " + n + gamesWord(n) + "</option>";
    }).join("");
  (document.getElementById("bakRestoreBtn") as HTMLButtonElement).textContent = t("bak_rollback");
}

export function wireBackup(): void {
  document.getElementById("bakRestoreBtn")!.addEventListener("click", function () {
    var sel = document.getElementById("bakSel") as HTMLSelectElement;
    var k = sel.value;
    if (!k) return;
    var snap = readSnapshot(k);
    if (!snap) { toast(t("not_backup") + label(k)); return; }
    if (!confirm(t("bak_confirm").replace("{d}", label(k)))) return;
    // keep an undo point: current state goes to the «before rollback» slot
    try { localStorage.setItem(PRERESTORE, JSON.stringify(state)); } catch (e) {}
    replaceState(migrate(snap));
    setOpenId(null);
    save(); // bump updatedAt: the rollback must win over remote
    render();
    refreshBackupUI();
    toast(t("bak_rolled") + label(k));
  });
}
