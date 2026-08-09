import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Build: ONE self-contained dist/index.html (inline CSS/JS) + manifest/icons
// copied from public/ (§3 CLAUDE.md).
export default defineConfig({
  root: "src",
  publicDir: "../public",
  base: "./",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    target: "es2018"
  },
  plugins: [viteSingleFile()]
});
