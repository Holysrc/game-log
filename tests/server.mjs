// Tiny static file server for tests. APP_DIR env selects the served folder
// (repo root for stage 0, dist/ after the Vite build).
import http from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(
  process.env.APP_DIR || join(fileURLToPath(import.meta.url), "..", "..")
);
const port = Number(process.env.PORT || 8123);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json"
};

http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      let path = decodeURIComponent(url.pathname);
      if (path.endsWith("/")) path += "index.html";
      const file = resolve(join(root, path));
      if (!file.startsWith(root + sep) && file !== root) {
        res.writeHead(403).end();
        return;
      }
      const data = await readFile(file);
      res.writeHead(200, {
        "Content-Type": MIME[extname(file).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "no-store"
      });
      res.end(data);
    } catch {
      res.writeHead(404).end("not found");
    }
  })
  .listen(port, () => console.log(`serving ${root} on http://localhost:${port}`));
