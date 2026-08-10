// Themes: CSS-variable presets on <html data-theme>. Device-local
// (localStorage), never synced — like language and dice filters.
import { t } from "./i18n";

var TKEY = "gamelog-theme";

// value "" = default Final Fantasy palette from §6 (no data-theme attr)
export var THEMES: Array<{ id: string; label: string; themeColor: string }> = [
  { id: "", label: "Final Fantasy", themeColor: "#0b1120" },
  { id: "genesis", label: "Sega Genesis", themeColor: "#0b0b0e" }
];

export var theme = "";
try { theme = localStorage.getItem(TKEY) || ""; } catch (e) {}
if (!THEMES.some(function (th) { return th.id === theme; })) theme = "";

export function applyTheme(): void {
  var root = document.documentElement;
  if (theme) root.setAttribute("data-theme", theme);
  else root.removeAttribute("data-theme");
  var def = THEMES.filter(function (th) { return th.id === theme; })[0] || THEMES[0];
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", def.themeColor);
}

export function setTheme(id: string): void {
  theme = THEMES.some(function (th) { return th.id === id; }) ? id : "";
  try { localStorage.setItem(TKEY, theme); } catch (e) {}
  applyTheme();
}

export function applyThemeLang(): void {
  var sel = document.getElementById("themeSel") as HTMLSelectElement;
  sel.setAttribute("aria-label", t("theme_aria"));
  // theme names are proper nouns — same in both locales
  sel.innerHTML = THEMES.map(function (th) {
    return '<option value="' + th.id + '"' + (th.id === theme ? " selected" : "") + '>'
      + th.label + '</option>';
  }).join("");
}

export function wireTheme(): void {
  document.getElementById("themeSel")!.addEventListener("change", function (e: any) {
    setTheme(e.target.value);
  });
}
