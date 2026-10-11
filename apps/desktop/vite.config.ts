import { defineConfig } from "vite";

// Ferrum shell bundle. Everything is local: the shell loads no remote resources (strict CSP in tauri.conf.json).
export default defineConfig({
  clearScreen: false,
  build: { outDir: "dist", emptyOutDir: true, target: "es2022" },
});
