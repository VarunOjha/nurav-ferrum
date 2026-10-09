/**
 * Lint finding shape shared by the loader, the parsers and (from IP-5) lib/lint (ip-wiki-lint §1).
 * `path` is repo-relative with forward slashes (e.g. `wiki/phases/phase-p1-foundation.md`).
 */
export type Severity = "error" | "warn" | "info";

export interface LintFinding {
  code: string;
  severity: Severity;
  path: string;
  id?: string;
  line?: number;
  message: string;
  hint?: string;
}

/**
 * Default severity of every lint code (SCHEMA §9.3 table; ip-wiki-lint §2, §2.1). SCHEMA §9.3 codes
 * keep their SCHEMA severity; the ip-wiki-lint §2.1 additions report as warn until SCHEMA adopts them.
 * Codes whose severity varies (STALE-UPDATED warn/error, APPROVAL-STALE info/warn, the info lines of
 * the git-backed rules) pass an explicit `severity` to `finding()`. SCHEMA-SPLIT is an error in SCHEMA
 * §9.3 but is not mechanically checkable: the lint only prints the manual reminder, as info.
 */
export const SEVERITY: Readonly<Record<string, Severity>> = {
  // SCHEMA §9.3
  "FM-MISSING": "error",
  "FM-ENUM": "error",
  "FM-TYPE-DIR": "error",
  "FM-UNKNOWN-KEY": "warn",
  "FILE-ENCODING": "error",
  "ID-PATTERN": "error",
  "ID-DUP": "error",
  "REF-DANGLING": "error",
  "REF-RECIPROCAL": "error",
  ORPHAN: "warn",
  "INDEX-MISSING": "error",
  "STALE-UPDATED": "warn",
  "ADR-CHAIN": "error",
  "PHASE-ORDER": "error",
  "TRUST-EDGE": "error",
  "UNV-NOPHASE": "error",
  "UNV-PASTDUE": "error",
  "INT-NUMBER-NOSRC": "warn",
  "HYP-NO-DATA": "error",
  "RAW-IMMUTABLE": "error",
  "APPROVAL-STALE": "info",
  CONTRADICTION: "warn",
  "SCHEMA-SPLIT": "info",
  "LOG-FORMAT": "error",
  "Q-FORMAT": "error",
  "Q-BLOCK-UNGATED": "warn",
  "PHASE-DONE-NO-EXIT": "warn",
  // SCHEMA §10.3 "INVALID: lint error"; adopted into the §9.3 table by adr-0022 (IP-9 review)
  "APPROVAL-INVALID": "error",
  // ip-wiki-lint §2.1 (warn until SCHEMA adopts them)
  "FM-VOLATILE": "warn",
  "FM-YAML-SUBSET": "warn",
  "ADR-SECTIONS": "warn",
  "HANDOFF-SECTIONS": "warn",
  "COMP-UNSAFE": "warn",
  "COMP-LVC": "warn",
  "EXP-RESULTS": "warn",
  "RISK-SCORE": "warn",
  "STATUS-APPROVED": "warn",
  "UNV-MIRROR": "warn",
  "MERMAID-RULES": "warn",
};

export function finding(
  code: string,
  path: string,
  message: string,
  extra: { id?: string; line?: number; hint?: string; severity?: Severity } = {},
): LintFinding {
  const severity = extra.severity ?? SEVERITY[code];
  if (!SEVERITY[code] || !severity) throw new Error(`unknown finding code ${code}`);
  const f: LintFinding = { code, severity, path, message };
  if (extra.id !== undefined) f.id = extra.id;
  if (extra.line !== undefined) f.line = extra.line;
  if (extra.hint !== undefined) f.hint = extra.hint;
  return f;
}
