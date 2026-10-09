// Shared E2E helpers: collect console errors and page errors for the "no console errors" checks.
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Page } from "@playwright/test";
import { envFromRoot, fingerprint, GUARDED } from "./setup-env";

export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  return errors;
}

/** Fixture ids and paths (tests/fixtures/mini-wiki + e2e-overlay). */
export const FX = {
  adr: "adr-0901",
  adrPath: "/wiki/decisions/adr-0901-fixture-decision.md",
  projectPath: "/wiki/overview/ov-fixture-project.md",
  renderPath: "/wiki/overview/ov-fixture-render.md",
  rawPath: "/wiki/raw/00-fixture-source.md",
  bodyWord: "zanzibarquill",
};

// ------------------------------------------------------------------------------------------
// IP-7: access to the temp fixture copy (never the real repo files). Workers inherit
// PLAN_E2E_ROOT from the main process (playwright.config.ts -> setup-env.ts).
// ------------------------------------------------------------------------------------------

export function e2eEnv() {
  const root = process.env.PLAN_E2E_ROOT;
  if (!root) throw new Error("PLAN_E2E_ROOT is not set: run through playwright.config.ts");
  const resolved = path.resolve(root);
  // Safety: every write below must land in the temp copy, never in the repository.
  if (!resolved.startsWith(path.join(os.tmpdir(), "ferrum plan e2e"))) throw new Error(`unexpected E2E root ${resolved}`);
  const env = envFromRoot(resolved);
  return { ...env, approvalsFile: path.join(env.dataDir, "approvals.json"), logFile: path.join(env.wikiDir, "log.md") };
}

/** Absolute path of a wiki-relative file in the temp copy. */
export const tmpWikiFile = (rel: string) => path.join(e2eEnv().wikiDir, ...rel.split("/"));

/** Bytes of a temp-copy file, or null when absent. */
export const readOrNull = (p: string): Buffer | null => (existsSync(p) ? readFileSync(p) : null);

/** Restores a temp-copy file to saved bytes (null = remove it). */
export function restore(p: string, saved: Buffer | null): void {
  if (saved === null) rmSync(p, { force: true });
  else writeFileSync(p, saved);
}

/** Replaces exactly one occurrence in a temp-copy wiki file. */
export function editOnce(rel: string, from: string, to: string): void {
  const p = tmpWikiFile(rel);
  const s = readFileSync(p, "utf8");
  if (s.split(from).length !== 2) throw new Error(`expected exactly one ${JSON.stringify(from)} in ${rel}`);
  writeFileSync(p, s.replace(from, to));
}

/** The real files guarded by global-teardown.ts are still unchanged (checked mid-run too). */
export function realFilesUnchanged(): { path: string; same: boolean }[] {
  const recorded = new Map(JSON.parse(process.env.PLAN_E2E_GUARD ?? "[]") as [string, string][]);
  return GUARDED.map((p) => ({ path: p, same: recorded.has(p) && recorded.get(p) === fingerprint(p) }));
}

export const PAGE_CHANGED_TEXT = "This page changed since you loaded it – reload to review the new version";

/** SCHEMA §12 heading regex (verbatim, as lib/wiki/log.ts). */
export const LOG_HEADING =
  /^## \[(\d{4}-\d{2}-\d{2})\] (ingest|query|lint|decide|handoff|resume|gate|code|approval|schema|correct|plan) \| (.+)$/;
