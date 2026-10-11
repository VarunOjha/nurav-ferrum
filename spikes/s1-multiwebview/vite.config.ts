import { defineConfig } from "vite";

// Shell bundle for spike S1. public/tab.html is copied as-is (tab fixture pages).
export default defineConfig({
  clearScreen: false,
  build: { outDir: "dist", emptyOutDir: true, target: "es2022" },
});
