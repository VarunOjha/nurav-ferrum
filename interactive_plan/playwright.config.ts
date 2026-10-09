// Playwright E2E (ip-testing §3). The tests never touch the real wiki/ or plan/approvals.json: the
// main process copies tests/fixtures/mini-wiki (plus the e2e-overlay files) to a temp directory whose
// path contains a space, writes a fixture STATUS.md and an empty plan/ dir, and points the webServer
// at them through PLAN_* variables. The temp dir is created here, at config load, because the
// webServer starts before globalSetup; worker processes inherit PLAN_E2E_ROOT and skip it.
// global-teardown.ts fails the run if the real approvals.json, log.md or STATUS.md changed.
// Port 3418 (the owner's app uses 3417). A server already on 3418 aborts the run: stop it first.
import { defineConfig, devices } from "@playwright/test";
import { prepareE2eRoot } from "./tests/e2e/setup-env";

const PORT = 3418;
const env = prepareE2eRoot();

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
  webServer: {
    command: `npm run build && npx next start -H 127.0.0.1 -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}/wiki`,
    reuseExistingServer: false,
    timeout: 300_000,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      PLAN_REPO_ROOT: env.root,
      PLAN_WIKI_DIR: env.wikiDir,
      PLAN_DATA_DIR: env.dataDir,
      PLAN_STATUS_FILE: env.statusFile,
      PLAN_PORT: String(PORT),
      PLAN_APPEND_LOG: "1",
    },
  },
});
