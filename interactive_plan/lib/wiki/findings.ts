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
 * Severity of each code the loader and parsers emit. SCHEMA §9.3 codes keep their SCHEMA
 * severity; the ip-wiki-lint §2.1 additions (FM-VOLATILE, FM-YAML-SUBSET) report as warn until
 * SCHEMA adopts them. LOG-FORMAT and Q-FORMAT are in the SCHEMA §9.3 table (error).
 */
export const SEVERITY: Readonly<Record<string, Severity>> = {
  "FM-MISSING": "error",
  "FM-ENUM": "error",
  "FM-TYPE-DIR": "error",
  "FM-UNKNOWN-KEY": "warn",
  "FILE-ENCODING": "error",
  "ID-PATTERN": "error",
  "ID-DUP": "error",
  "REF-DANGLING": "error",
  "LOG-FORMAT": "error",
  "Q-FORMAT": "error",
  "FM-VOLATILE": "warn",
  "FM-YAML-SUBSET": "warn",
};

export function finding(
  code: string,
  path: string,
  message: string,
  extra: { id?: string; line?: number; hint?: string } = {},
): LintFinding {
  const severity = SEVERITY[code];
  if (!severity) throw new Error(`unknown finding code ${code}`);
  const f: LintFinding = { code, severity, path, message };
  if (extra.id !== undefined) f.id = extra.id;
  if (extra.line !== undefined) f.line = extra.line;
  if (extra.hint !== undefined) f.hint = extra.hint;
  return f;
}
