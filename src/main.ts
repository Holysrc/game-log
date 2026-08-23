// Entry point: wires modules in the same order the legacy IIFE executed.
import "./fonts.css";
import "./styles.css";
import { initData, onSave, storageOK } from "./data";
import { t } from "./i18n";
import { toast } from "./util";
import { wireUI, applyLang, langHooks, setDiceHandler } from "./ui";
import { wireImporter } from "./importer";
import { wireSyncPanel, scheduleFileWrite, schedulePush, syncOn, pullRemote } from "./sync";
import { wireResults, applyResultsLang } from "./results";
import { wireDice, openDice, applyDiceLang } from "./dice";
import { applyTheme, wireTheme, applyThemeLang } from "./theme";
import { initAutoBackup, wireBackup, refreshBackupUI } from "./backup";

applyTheme(); // before first paint of any window
initData();
initAutoBackup(); // daily snapshot of the freshly loaded state

// save() side effects: local-file autosave + debounced remote push
onSave(scheduleFileWrite);
onSave(schedulePush);

if (!storageOK) setTimeout(function () { toast(t("storage_warn")); }, 600);

wireUI();
wireImporter();
wireSyncPanel();
wireResults();
wireDice();
wireTheme();
wireBackup();
setDiceHandler(openDice); // 🎲 tap opens the smart-dice filter window
langHooks.push(applyResultsLang);
langHooks.push(applyDiceLang);
langHooks.push(applyThemeLang);
langHooks.push(refreshBackupUI);

var t0 = performance.now();
applyLang();
(window as any).__firstRenderMs = performance.now() - t0; // perf budget probe (§7)
if (syncOn()) pullRemote();

// offline app-shell (§3: works offline after first load)
if ("serviceWorker" in navigator) {
  try {
    navigator.serviceWorker.register("./sw.js");
  } catch (e) {}
}
