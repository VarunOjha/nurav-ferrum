// Playwright E2E for the read-only portal (p0.17). One production server on 127.0.0.1:3418 reads the
// REAL plan/ folder: the portal never writes, and global-teardown.ts fails the run if
// plan/approvals.json, any plan/portal JSON file, wiki/log.md or STATUS.md changed. The repo path
// contains a space, so every run also checks that paths with a space work.
// Port 3418 (the owner's portal uses 3417). A server already on 3418 aborts the run: stop it first.
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { PORT, recordGuard } from "./tests/e2e/helpers";

const REPO_ROOT = path.resolve(__dirname, "..");
recordGuard();

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  globalTeardown: "./tests/e2e/global-teardown.ts",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1360, height: 900 } } }],
  webServer: [
    {
      command: `npm run build && npx next start -H 127.0.0.1 -p ${PORT}`,
      url: `http://127.0.0.1:${PORT}/`,
      reuseExistingServer: false,
      timeout: 300_000,
      stdout: "ignore",
      stderr: "pipe",
      env: {
        PLAN_REPO_ROOT: REPO_ROOT,
        PLAN_WIKI_DIR: path.join(REPO_ROOT, "wiki"),
        PLAN_DATA_DIR: path.join(REPO_ROOT, "plan"),
        PLAN_STATUS_FILE: path.join(REPO_ROOT, "STATUS.md"),
        PLAN_PORT: String(PORT),
      },
    },
  ],
});
