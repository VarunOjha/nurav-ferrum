/**
 * Phase detail view model (ip-routes-and-views §3.4) and the lint report grouping (§3.12). Pure.
 */
import type { LintFinding, Severity } from "../wiki/findings";

/** Phase statuses for which the exit approve bar is shown (a record already present also shows it). */
export const EXIT_READY = new Set(["gate-review", "done"]);

/** §3.4: the exit bar is shown only when status ∈ {gate-review, done} or a record already exists. */
export function exitBarVisible(status: string | null | undefined, hasRecord: boolean): boolean {
  return hasRecord || (!!status && EXIT_READY.has(status));
}

export interface EvidenceCheck {
  /** As written on the phase page. */
  entry: string;
  /** Wiki-relative path that was checked. */
  path: string;
  exists: boolean;
  /** The path is not under `raw/evidence/<phase-id>/`. */
  outside: boolean;
}

/**
 * §3.4 test gate: each evidence path is checked for existence under `wiki/raw/evidence/<phase-id>/`.
 * An entry that starts with `raw/` is taken as a wiki-relative path (as the real phase pages write
 * it); any other entry is a file name inside the phase's evidence folder. An optional `#anchor`
 * is ignored.
 */
export function evidenceChecks(phaseId: string, evidence: readonly string[], files: ReadonlySet<string>): EvidenceCheck[] {
  const dir = `raw/evidence/${phaseId}/`;
  return evidence.map((entry) => {
    const bare = entry.trim().replace(/#.*$/, "").replace(/^\.\//, "");
    const p = bare.startsWith("raw/") ? bare : dir + bare;
    const safe = !p.split("/").some((s) => s === ".." || s === "." || s === "") && !p.includes("\\");
    return { entry, path: p, exists: safe && files.has(p), outside: !p.startsWith(dir) };
  });
}

/** Risk score L×I (SCHEMA §6.5). */
export const riskScore = (likelihood: number, impact: number): number => likelihood * impact;

export interface LintGroup {
  severity: Severity;
  codes: { code: string; findings: LintFinding[] }[];
  count: number;
}

const SEV_ORDER: Severity[] = ["error", "warn", "info"];

/** §3.12: findings grouped by severity (error, warn, info) and then by code (alphabetical). */
export function groupFindings(findings: readonly LintFinding[]): LintGroup[] {
  const out: LintGroup[] = [];
  for (const severity of SEV_ORDER) {
    const list = findings.filter((f) => f.severity === severity);
    if (list.length === 0) continue;
    const byCode = new Map<string, LintFinding[]>();
    for (const f of list) {
      if (!byCode.has(f.code)) byCode.set(f.code, []);
      byCode.get(f.code)!.push(f);
    }
    const codes = [...byCode.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([code, fs]) => ({ code, findings: fs }));
    out.push({ severity, codes, count: list.length });
  }
  return out;
}
