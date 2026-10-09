/**
 * Builds a LintContext from the environment config (ip-wiki-lint §1 inputs: PLAN_WIKI_DIR,
 * PLAN_STATUS_FILE, PLAN_DATA_DIR, PLAN_REPO_ROOT). Reads only: the wiki, STATUS.md, approvals.json,
 * CLAUDE.md (bootstrap hash), git (lib/lint/git.ts) and MANIFEST.sha256.
 */
import path from "node:path";
import { readApprovals } from "../approvals/file";
import type { Approvals } from "../approvals/model";
import type { PlanConfig } from "../config";
import { loadWiki } from "../wiki/load";
import { checkManifest, collectGit, type GitExec } from "./git";
import type { GitState, LintContext } from "./types";
import { localDate } from "./util";

export interface ContextOptions {
  /** false: do not run git (git rules report an info line); a function: injected git exec (tests). */
  git?: boolean | GitExec;
  /** Override "today" (tests). Default: local date. */
  today?: string;
}

export type LintConfig = Pick<PlanConfig, "wikiDir" | "statusFile" | "repoRoot" | "approvalsFile">;

export async function buildLintContext(cfg: LintConfig, opts: ContextOptions = {}): Promise<LintContext> {
  const [idx, file] = await Promise.all([loadWiki(cfg), readApprovals(cfg.approvalsFile)]);
  let git: GitState;
  if (opts.git === false) git = { kind: "unavailable", reason: "git disabled for this run" };
  else git = await collectGit(cfg.repoRoot, typeof opts.git === "function" ? { exec: opts.git } : {});
  const rel = path.relative(cfg.repoRoot, cfg.approvalsFile).split(path.sep).join("/");
  return {
    idx,
    approvals: {
      exists: file.exists,
      valid: file.valid,
      error: file.error,
      approvals: (file.valid && file.data ? file.data.approvals : {}) as Approvals,
    },
    today: opts.today ?? localDate(),
    git,
    manifest: git.kind === "ok" ? null : checkManifest(cfg.wikiDir),
    approvalsPath: rel.startsWith("..") || path.isAbsolute(rel) ? cfg.approvalsFile.split(path.sep).join("/") : rel,
  };
}

export function describeGit(g: GitState): string {
  return g.kind === "ok" ? "ok" : g.kind === "no-commits" ? "no commits (manifest fallback)" : `unavailable: ${g.reason}`;
}
