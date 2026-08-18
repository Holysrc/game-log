// Sync: optional local-file autosave (File System Access) + remote sync via
// GitHub Gist or Google Apps Script. Protocol per §3: PATCH whole file,
// last-write-wins by updatedAt; pull never bumps updatedAt.
import { state, replaceState, migrate } from "./data";
import { t } from "./i18n";
import { toast } from "./util";
import { render, setOpenId, refreshNoMergeBtn } from "./ui";
import { refreshBackupUI } from "./backup";

/* ---- файл данных (game-log.json в облачной папке) ---- */
export var fileHandle: any = null;
var fsTimer: any = null;

export function canFS(): boolean {
  return typeof (window as any).showSaveFilePicker === "function";
}

export function setFileHandle(h: any): void {
  fileHandle = h;
}

export function setFStatus(name: string | null): void {
  var el = document.getElementById("fstatus")!;
  if (name) {
    el.textContent = name + " · " + t("autosave");
    (el as any).hidden = false;
  } else (el as any).hidden = true;
}

export function writeToFile(): void {
  if (!fileHandle) return;
  fileHandle.createWritable().then(function (w: any) {
    return w.write(JSON.stringify(state, null, 2)).then(function () { return w.close(); });
  }).catch(function () {
    fileHandle = null;
    setFStatus(null);
    toast(t("offline"));
  });
}

export function scheduleFileWrite(): void {
  if (!fileHandle) return;
  clearTimeout(fsTimer);
  fsTimer = setTimeout(writeToFile, 500);
}

/* ---- синхронизация через GitHub Gist / Apps Script ---- */
var SKEY = "gamelog-sync-v1";
export var syncCfg: any = { token: "", gist: "" };
try {
  var sc = localStorage.getItem(SKEY);
  if (sc) syncCfg = JSON.parse(sc);
} catch (e) {}
var pushTimer: any = null, syncBusy = false;

export function syncOn(): boolean {
  return !!(syncCfg.gs || (syncCfg.token && syncCfg.gist));
}
function syncLabel(): string {
  return syncCfg.gs ? "drive" : "gist";
}
function saveSyncCfg(): void {
  try { localStorage.setItem(SKEY, JSON.stringify(syncCfg)); } catch (e) {}
}
function nowTime(): string {
  var d = new Date();
  return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
}
export function setStatus(text: string | null, err?: boolean): void {
  var el = document.getElementById("fstatus")!;
  if (!text) { (el as any).hidden = true; return; }
  el.textContent = text;
  (el as any).hidden = false;
  el.classList.toggle("err", !!err);
}
function gh(method: string, path: string, body?: any): Promise<any> {
  return fetch("https://api.github.com" + path, {
    method: method,
    headers: {
      "Authorization": "Bearer " + syncCfg.token,
      "Accept": "application/vnd.github+json"
    },
    body: body ? JSON.stringify(body) : undefined
  }).then(function (r) {
    if (!r.ok) throw new Error("GitHub: " + r.status + (r.status === 401 ? t("gh_bad_token") : ""));
    return r.json();
  });
}
function remoteGet(): Promise<any> {
  if (syncCfg.gs) {
    return fetch(syncCfg.gs).then(function (r) {
      if (!r.ok) throw new Error("Drive: " + r.status);
      return r.text();
    }).then(function (txt) {
      try { return JSON.parse(txt); } catch (e) { return null; } // пустой/новый файл
    });
  }
  return gh("GET", "/gists/" + syncCfg.gist).then(function (g) {
    var f = g.files && g.files["game-log.json"];
    if (!f || !f.content) return null;
    return JSON.parse(f.content);
  });
}
function remotePut(): Promise<any> {
  if (syncCfg.gs) {
    // без заголовков: text/plain обходит preflight, который Apps Script не умеет
    return fetch(syncCfg.gs, { method: "POST", body: JSON.stringify(state) }).then(function (r) {
      if (!r.ok) throw new Error("Drive: " + r.status);
    });
  }
  return gh("PATCH", "/gists/" + syncCfg.gist,
    { files: { "game-log.json": { content: JSON.stringify(state) } } });
}
export function pushRemote(): void {
  if (!syncOn() || syncBusy) return;
  syncBusy = true;
  remotePut()
    .then(function () { setStatus(syncLabel() + " · " + t("sync") + " " + nowTime()); })
    .catch(function () { setStatus(t("offline"), true); })
    .then(function () { syncBusy = false; });
}
export function schedulePush(): void {
  if (!syncOn()) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushRemote, 1500);
}
export function pullRemote(): void {
  if (!syncOn()) return;
  setStatus(syncLabel() + " · " + t("syncing"));
  remoteGet().then(function (remote) {
    if (!remote || !Array.isArray(remote.games)) { pushRemote(); return; } // там пусто — заливаем своё
    var r = remote.updatedAt || 0, l = state.updatedAt || 0;
    if (r > l) {
      replaceState(migrate(remote));
      setOpenId(null);
      render();
      setStatus(syncLabel() + " · " + t("sync") + " " + nowTime());
    } else if (l > r) {
      pushRemote();
    } else setStatus(syncLabel() + " · " + t("sync") + " " + nowTime());
  }).catch(function (e) { setStatus(t("offline_local") + " (" + e.message + ")", true); });
}

/* ---- панель синхронизации ---- */
function setSyncSpoiler(open: boolean): void {
  var body = document.getElementById("syncBody") as any;
  var sp = document.getElementById("syncSpoiler")!;
  body.hidden = !open;
  sp.classList.toggle("col", !open);
  sp.setAttribute("aria-expanded", String(open));
}
export function wireSyncPanel(): void {
  // sync settings live under a spoiler; ⓘ toggles the short how-to
  document.getElementById("syncSpoiler")!.addEventListener("click", function () {
    setSyncSpoiler((document.getElementById("syncBody") as any).hidden);
  });
  document.getElementById("syncHelpBtn")!.addEventListener("click", function () {
    var help = document.getElementById("syncHelp") as any;
    help.hidden = !help.hidden;
  });
  // настройки — полноэкранное окно, как «Итоги»
  var closeSettings = function () {
    (document.getElementById("settingsWin") as any).hidden = true;
    document.body.classList.remove("noscroll");
  };
  document.getElementById("gearBtn")!.addEventListener("click", function () {
    (document.getElementById("settingsWin") as any).hidden = false;
    document.body.classList.add("noscroll");
    refreshNoMergeBtn();
    refreshBackupUI();
    (document.getElementById("gsUrl") as HTMLInputElement).value = syncCfg.gs || "";
    (document.getElementById("ghToken") as HTMLInputElement).value = syncCfg.token || "";
    (document.getElementById("ghGist") as HTMLInputElement).value = syncCfg.gist || "";
    // not connected yet → the fields are what the user came for; show them
    setSyncSpoiler(!syncOn());
  });
  document.getElementById("setClose")!.addEventListener("click", closeSettings);
  document.addEventListener("keydown", function (e: any) {
    if (e.key === "Escape" && !(document.getElementById("settingsWin") as any).hidden) closeSettings();
  });
  document.getElementById("syncConnect")!.addEventListener("click", function () {
    var gs = (document.getElementById("gsUrl") as HTMLInputElement).value.trim();
    var tok = (document.getElementById("ghToken") as HTMLInputElement).value.trim();
    var g = (document.getElementById("ghGist") as HTMLInputElement).value.trim();
    if (gs) {
      if (gs.indexOf("https://script.google.com/") !== 0) {
        toast(t("bad_url"));
        return;
      }
      syncCfg = { gs: gs, token: "", gist: "" };
      saveSyncCfg();
      pullRemote();
      closeSettings();
      toast(t("connected_drive"));
      return;
    }
    if (!tok) { toast(t("need_token")); return; }
    syncCfg = { gs: "", token: tok, gist: g };
    if (g) {
      saveSyncCfg();
      pullRemote();
      closeSettings();
      toast(t("connected"));
    } else {
      gh("POST", "/gists", {
        description: "Game log — журнал игр",
        "public": false,
        files: { "game-log.json": { content: JSON.stringify(state) } }
      }).then(function (res) {
        syncCfg.gist = res.id;
        saveSyncCfg();
        (document.getElementById("ghGist") as HTMLInputElement).value = res.id;
        setStatus("gist · " + t("sync") + " " + nowTime());
        toast(t("gist_created"));
      }).catch(function (e) { toast(t("gist_fail") + e.message); });
    }
  });
  document.getElementById("syncOff")!.addEventListener("click", function () {
    syncCfg = { gs: "", token: "", gist: "" };
    saveSyncCfg();
    setStatus(null);
    toast(t("sync_off"));
  });
  window.addEventListener("online", function () { if (syncOn()) pullRemote(); });
}
