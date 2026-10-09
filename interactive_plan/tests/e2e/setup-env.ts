// E2E environment (ip-testing §3 setup). Runs once in the Playwright main process (from
// playwright.config.ts): copies the fixture wiki to `<os tmp>/ferrum plan e2e/run-*` (a path with a
// space, on purpose), overlays tests/fixtures/e2e-overlay, writes STATUS.md, CLAUDE.md and an empty plan/ dir,
// and fingerprints the real files the guard in global-teardown.ts re-checks.
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export interface E2eEnv {
  root: string;
  wikiDir: string;
  dataDir: string;
  statusFile: string;
}

export const APP_DIR = path.resolve(__dirname, "..", "..");
export const REPO_ROOT = path.resolve(APP_DIR, "..");
const FIXTURES = path.join(APP_DIR, "tests", "fixtures");

/** Real files that must be byte-identical (and have the same mtime) after the run. */
export const GUARDED = [
  path.join(REPO_ROOT, "plan", "approvals.json"),
  path.join(REPO_ROOT, "wiki", "log.md"),
  path.join(REPO_ROOT, "STATUS.md"),
];

export function fingerprint(p: string): string {
  if (!existsSync(p)) return "absent";
  return `${statSync(p).mtimeMs}:${createHash("sha256").update(readFileSync(p)).digest("hex")}`;
}

export function envFromRoot(root: string): E2eEnv {
  return {
    root,
    wikiDir: path.join(root, "wiki"),
    dataDir: path.join(root, "plan"),
    statusFile: path.join(root, "STATUS.md"),
  };
}

export function prepareE2eRoot(): E2eEnv {
  const existing = process.env.PLAN_E2E_ROOT;
  if (existing) return envFromRoot(existing);
  const base = path.join(os.tmpdir(), "ferrum plan e2e");
  mkdirSync(base, { recursive: true });
  const root = mkdtempSync(path.join(base, "run-"));
  const env = envFromRoot(root);
  cpSync(path.join(FIXTURES, "mini-wiki"), env.wikiDir, { recursive: true });
  cpSync(path.join(FIXTURES, "e2e-overlay"), env.wikiDir, { recursive: true });
  cpSync(path.join(FIXTURES, "status", "STATUS.md"), env.statusFile);
  // Root CLAUDE.md (bootstrap file approved with `schema`, shown on the schema page).
  cpSync(path.join(FIXTURES, "status", "CLAUDE.md"), path.join(root, "CLAUDE.md"));
  mkdirSync(env.dataDir, { recursive: true });
  process.env.PLAN_E2E_ROOT = root;
  process.env.PLAN_E2E_GUARD = JSON.stringify(GUARDED.map((p) => [p, fingerprint(p)]));
  writeFileSync(path.join(root, "README.txt"), "Temporary Playwright fixture copy (interactive_plan tests/e2e). Safe to delete.\n");
  return env;
}
