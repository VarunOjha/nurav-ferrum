/**
 * Wiki lint engine types (ip-wiki-lint §1). A rule is `{ code, severity, run(ctx) }` over the loaded
 * WikiIndex; `severity` is the rule's default (individual findings may differ, e.g. STALE-UPDATED is an
 * error for a future date). Rules are pure: every fs/git fact they need is in the context.
 */
import type { Approvals } from "../approvals/model";
import type { LintFinding, Severity } from "../wiki/findings";
import type { WikiIndex } from "../wiki/load";

export type { LintFinding, Severity };

/** Facts read from git by lib/lint/git.ts (ip-wiki-lint §3). Paths are repo-relative, forward slashes. */
export interface GitFacts {
  /** Last commit date (`%cs`, YYYY-MM-DD) per path that has at least one commit. */
  lastCommitDate: Map<string, string>;
  /** Commits that modified, renamed or deleted a file under wiki/raw/ (MANIFEST.sha256 appends excluded). */
  rawHistoryChanges: { commit: string; status: string; path: string; detail?: string }[];
  /** Uncommitted changes to tracked files under wiki/raw/ (`git status --porcelain`), appends to MANIFEST.sha256 excluded. */
  rawWorkingChanges: { status: string; path: string; detail?: string }[];
}

/** Git availability for the git-backed rules. */
export type GitState =
  | { kind: "ok"; facts: GitFacts }
  /** git ran but the repository has no commit yet: RAW-IMMUTABLE falls back to the manifest. */
  | { kind: "no-commits" }
  /** git missing, not a repository, or deliberately not used (unit tests): the git rules are skipped with an info line. */
  | { kind: "unavailable"; reason: string };

/** One parsed `wiki/raw/MANIFEST.sha256` line and the current hash of the file it names (null = file missing). */
export interface ManifestCheck {
  present: boolean;
  entries: { path: string; expected: string; actual: string | null; line: number }[];
  malformed: { line: number; text: string }[];
}

export interface ApprovalsInput {
  exists: boolean;
  valid: boolean;
  error: string | null;
  /** Parsed records (empty when the file is missing or invalid). */
  approvals: Approvals;
}

export interface LintContext {
  idx: WikiIndex;
  approvals: ApprovalsInput;
  /** Local date YYYY-MM-DD ("today" for STALE-UPDATED). */
  today: string;
  git: GitState;
  /** Manifest fallback for RAW-IMMUTABLE before any commit exists (null when not computed). */
  manifest: ManifestCheck | null;
  /** Repo-relative path of the approvals file (for APPROVAL-INVALID findings). */
  approvalsPath: string;
}

export interface Rule {
  code: string;
  severity: Severity;
  run(ctx: LintContext): LintFinding[];
}

export interface LintSummary {
  errors: number;
  warnings: number;
  info: number;
  pages: number;
}

export interface LintReport {
  findings: LintFinding[];
  summary: LintSummary;
}
