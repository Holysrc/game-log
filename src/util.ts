export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, " ")
    .trim();
}

export function toast(msg: string): void {
  var t = document.getElementById("toast") as any;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(function () {
    t.classList.remove("show");
  }, 2600);
}
