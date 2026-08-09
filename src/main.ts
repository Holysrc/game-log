// Entry point: wires modules in the same order the legacy IIFE executed.
import "./styles.css";
import { initData, onSave, storageOK } from "./data";
import { t } from "./i18n";
import { toast } from "./util";
import { wireUI, applyLang, langHooks } from "./ui";
import { wireImporter } from "./importer";
import { wireSyncPanel, scheduleFileWrite, schedulePush, syncOn, pullRemote } from "./sync";
import { wireResults, applyResultsLang } from "./results";

initData();

// save() side effects: local-file autosave + debounced remote push
onSave(scheduleFileWrite);
onSave(schedulePush);

if (!storageOK) setTimeout(function () { toast(t("storage_warn")); }, 600);

wireUI();
wireImporter();
wireSyncPanel();
wireResults();
langHooks.push(applyResultsLang);

applyLang();
if (syncOn()) pullRemote();
