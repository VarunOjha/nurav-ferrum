// Playwright E2E (ip-testing §3). The tests never touch the real wiki/ or plan/approvals.json: the
// main process copies tests/fixtures/mini-wiki (plus the e2e-overlay files) to a temp directory whose
// path contains a space, writes a fixture STATUS.md and an empty plan/ dir, and points the webServer
// at them through PLAN_* variables. The temp dir is created here, at config load, because the
// webServer starts before globalSetup; worker processes inherit PLAN_E2E_ROOT and skip it.
// global-teardown.ts fails the run if the real approvals.json, log.md or STATUS.md changed.
// Ports 3418, 3419 and 3420 (the owner's app uses 3417). A server already on one aborts the run: stop it first.
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { prepareE2eRoot } from "./tests/e2e/setup-env";

const PORT = 3418;
/** Second server of the same build with PLAN_READONLY=1 (security.spec, IP-9). */
const RO_PORT = 3419;
/**
 * Third server of the same build, read-only, on the REAL wiki (IP-10 follow-up): architecture-real.spec
 * checks the hover labels of the real component graph, which the two-component fixture cannot show.
 * PLAN_READONLY=1 and PLAN_APPEND_LOG=0, so it cannot write anything; global-teardown still checks
 * that approvals.json, log.md and STATUS.md are unchanged. Keep in sync with architecture-real.spec.ts.
 */
const REAL_PORT = 3420;
const REPO_ROOT = path.resolve(__dirname, "..");
const env = prepareE2eRoot();
const planEnv = {
  PLAN_REPO_ROOT: env.root,
  PLAN_WIKI_DIR: env.wikiDir,
  PLAN_DATA_DIR: env.dataDir,
  PLAN_STATUS_FILE: env.statusFile,
};

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
  // Two servers, started one after the other (Playwright awaits each webServer before the next): the
  // writable one on 3418 builds first; the PLAN_READONLY=1 one on 3419 serves the same build and the
  // same temp fixture for security.spec (IP-9). Both bind 127.0.0.1 only.
  webServer: [
    {
      command: `npm run build && npx next start -H 127.0.0.1 -p ${PORT}`,
      url: `http://127.0.0.1:${PORT}/wiki`,
      reuseExistingServer: false,
      timeout: 300_000,
      stdout: "ignore",
      stderr: "pipe",
      env: { ...planEnv, PLAN_PORT: String(PORT), PLAN_APPEND_LOG: "1" },
    },
    {
      command: `npx next start -H 127.0.0.1 -p ${RO_PORT}`,
      url: `http://127.0.0.1:${RO_PORT}/wiki`,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: "ignore",
      stderr: "pipe",
      env: { ...planEnv, PLAN_PORT: String(RO_PORT), PLAN_APPEND_LOG: "0", PLAN_READONLY: "1" },
    },
    {
      command: `npx next start -H 127.0.0.1 -p ${REAL_PORT}`,
      url: `http://127.0.0.1:${REAL_PORT}/wiki`,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: "ignore",
      stderr: "pipe",
      env: {
        PLAN_REPO_ROOT: REPO_ROOT,
        PLAN_WIKI_DIR: path.join(REPO_ROOT, "wiki"),
        PLAN_DATA_DIR: path.join(REPO_ROOT, "plan"),
        PLAN_STATUS_FILE: path.join(REPO_ROOT, "STATUS.md"),
        PLAN_PORT: String(REAL_PORT),
        PLAN_APPEND_LOG: "0",
        PLAN_READONLY: "1",
      },
    },
  ],
});
