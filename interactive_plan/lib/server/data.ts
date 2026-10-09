/**
 * Per-request data access for the server components (ip-spec §5.3 "pure logic, thin pages"). React
 * `cache()` dedupes the loads inside one request (layout + page); the loader's own mtime cache keeps
 * re-parsing to changed files only. The lint report is memoised for a few seconds on the file
 * signature, because the git-backed rules spawn git (ip-wiki-lint §3).
 */
import { statSync } from "node:fs";
import path from "node:path";
import { cache } from "react";
import { readApprovals, type ApprovalsRead } from "../approvals/file";
import { withMutex } from "../approvals/lock";
import { getView, type ApprovalsView } from "../approvals/view";
import { getConfig, type PlanConfig } from "../config";
import { buildLintContext } from "../lint/context";
import { runLint } from "../lint/run";
import type { LintReport } from "../lint/types";
import { loadWiki, type WikiIndex } from "../wiki/load";

export const config = cache((): PlanConfig => getConfig());

export const getIndex = cache((): Promise<WikiIndex> => loadWiki(config()));

export const getApprovals = cache((): Promise<ApprovalsView> => getView(config()));

/** approvals.json as read (for the entry-gate evaluation); read under the same in-process mutex as the API GET. */
export const getApprovalsFile = cache((): Promise<ApprovalsRead> => {
  const cfg = config();
  return withMutex(path.join(cfg.dataDir, ".approvals.lock"), () => readApprovals(cfg.approvalsFile));
});

const LINT_TTL_MS = 10_000;
let lintMemo: { sig: string; at: number; report: LintReport } | null = null;

function fileSig(p: string): string {
  try {
    const s = statSync(p);
    return `${s.mtimeMs}:${s.size}`;
  } catch {
    return "absent";
  }
}

export const getLint = cache(async (): Promise<LintReport> => {
  const cfg = config();
  const idx = await getIndex();
  const sig = [idx.pages.map((p) => `${p.path}:${p.mtimeMs}:${p.size}`).join("|"), fileSig(cfg.approvalsFile)].join("#");
  const now = Date.now();
  if (lintMemo && lintMemo.sig === sig && now - lintMemo.at < LINT_TTL_MS) return lintMemo.report;
  const report = runLint(await buildLintContext(cfg));
  lintMemo = { sig, at: now, report };
  return report;
});
