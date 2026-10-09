/**
 * Lint runner (ip-wiki-lint §1): runs every rule, sorts the findings (severity, path, line) and
 * formats the human report and the JSON report. Pure: the context carries every input.
 */
import type { LintFinding, Severity } from "../wiki/findings";
import { approvalInvalid, approvalStale, statusApproved } from "./rules/approvals";
import { rawImmutable, staleUpdated } from "./rules/gitRules";
import { indexMissing } from "./rules/indexRule";
import { contradiction, intNumberNoSrc, mermaidRules, schemaSplit, unvMirror, unvNoPhase, unvPastDue } from "./rules/integrity";
import { loaderRules, orphan, refDangling, refReciprocal } from "./rules/refs";
import {
  adrChain,
  adrSections,
  compLvc,
  compUnsafe,
  expResults,
  handoffSections,
  hypNoData,
  phaseDoneNoExit,
  phaseOrder,
  qBlockUngated,
  riskScore,
  trustEdge,
} from "./rules/structure";
import type { LintContext, LintReport, LintSummary, Rule } from "./types";

/** Every rule, in SCHEMA §9.3 / ip-wiki-lint §2, §2.1 order (loader codes first). */
export const RULES: readonly Rule[] = [
  ...loaderRules,
  refDangling,
  refReciprocal,
  orphan,
  indexMissing,
  staleUpdated,
  adrChain,
  phaseOrder,
  trustEdge,
  unvNoPhase,
  unvPastDue,
  intNumberNoSrc,
  hypNoData,
  rawImmutable,
  approvalStale,
  contradiction,
  schemaSplit,
  qBlockUngated,
  phaseDoneNoExit,
  adrSections,
  handoffSections,
  compUnsafe,
  compLvc,
  expResults,
  riskScore,
  statusApproved,
  approvalInvalid,
  unvMirror,
  mermaidRules,
];

const RANK: Record<Severity, number> = { error: 0, warn: 1, info: 2 };

export function compareFindings(a: LintFinding, b: LintFinding): number {
  return (
    RANK[a.severity] - RANK[b.severity] ||
    (a.path < b.path ? -1 : a.path > b.path ? 1 : 0) ||
    (a.line ?? 0) - (b.line ?? 0) ||
    (a.code < b.code ? -1 : a.code > b.code ? 1 : 0) ||
    (a.message < b.message ? -1 : a.message > b.message ? 1 : 0)
  );
}

export function runLint(ctx: LintContext, rules: readonly Rule[] = RULES): LintReport {
  const findings = rules.flatMap((r) => r.run(ctx)).sort(compareFindings);
  const summary: LintSummary = {
    errors: findings.filter((f) => f.severity === "error").length,
    warnings: findings.filter((f) => f.severity === "warn").length,
    info: findings.filter((f) => f.severity === "info").length,
    pages: ctx.idx.pages.filter((p) => p.kind !== "raw").length,
  };
  return { findings, summary };
}

const LABEL: Record<Severity, string> = { error: "ERROR", warn: "WARN", info: "INFO" };

/** `ERROR REF-DANGLING wiki/phases/x.md:12  related → adr-0099 does not resolve` */
export function formatFinding(f: LintFinding): string {
  return `${LABEL[f.severity]} ${f.code} ${f.path}${f.line ? ":" + f.line : ""}  ${f.message}`;
}

export function formatSummary(s: LintSummary): string {
  return `lint: ${s.errors} errors, ${s.warnings} warnings, ${s.info} info (pages: ${s.pages})`;
}

export function formatReport(r: LintReport): string {
  return [...r.findings.map(formatFinding), formatSummary(r.summary)].join("\n");
}

export interface JsonMeta {
  generated_at: string;
  today: string;
  wiki_dir: string;
  repo_root: string;
  git: string;
  approvals_file: { path: string; exists: boolean; valid: boolean };
  node: string;
}

/** The JSON report (`npm run lint:wiki:json`, evidence at phase gates). */
export function toJson(r: LintReport, meta: JsonMeta): string {
  const counts: Record<string, number> = {};
  for (const f of r.findings) counts[`${f.severity} ${f.code}`] = (counts[`${f.severity} ${f.code}`] ?? 0) + 1;
  return (
    JSON.stringify(
      {
        schema_version: 1,
        tool: "interactive_plan lib/lint (npm run lint:wiki:json)",
        ...meta,
        summary: r.summary,
        clean: r.summary.errors === 0,
        counts_by_code: Object.fromEntries(Object.entries(counts).sort()),
        rules: RULES.map((x) => ({ code: x.code, severity: x.severity })),
        findings: r.findings,
      },
      null,
      2,
    ) + "\n"
  );
}
