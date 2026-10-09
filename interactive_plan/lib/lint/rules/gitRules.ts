/**
 * Git-backed rules (ip-wiki-lint §3): STALE-UPDATED (with the git-independent "future date" error)
 * and RAW-IMMUTABLE (git history + working tree, manifest fallback before any commit). The git facts
 * are collected beforehand by lib/lint/git.ts; these rules are pure.
 */
import { finding, type LintFinding } from "../../wiki/findings";
import { MANIFEST_PATH } from "../git";
import type { Rule } from "../types";
import { fmObj, isPage } from "../util";

export const staleUpdated: Rule = {
  code: "STALE-UPDATED",
  severity: "warn",
  run({ idx, today, git }) {
    const out: LintFinding[] = [];
    for (const p of idx.pages) {
      if (!isPage(p)) continue;
      const updated = fmObj(p).updated;
      if (typeof updated !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(updated)) continue; // FM-MISSING
      if (updated > today) {
        out.push(finding("STALE-UPDATED", p.repoPath, `updated ${updated} is in the future (today ${today})`, { id: p.id, severity: "error" }));
        continue;
      }
      if (git.kind !== "ok") continue;
      const last = git.facts.lastCommitDate.get(p.repoPath);
      if (last && updated < last) {
        out.push(finding("STALE-UPDATED", p.repoPath, `updated ${updated} is older than the last commit of the file (${last})`, { id: p.id }));
      }
    }
    if (git.kind !== "ok") {
      const why = git.kind === "no-commits" ? "the repository has no commit yet" : git.reason;
      out.push(finding("STALE-UPDATED", "wiki/", `git comparison skipped: ${why}`, { severity: "info" }));
    }
    return out;
  },
};

export const rawImmutable: Rule = {
  code: "RAW-IMMUTABLE",
  severity: "error",
  run({ git, manifest }) {
    const out: LintFinding[] = [];
    if (git.kind === "ok") {
      for (const c of git.facts.rawHistoryChanges) {
        out.push(
          finding("RAW-IMMUTABLE", c.path, `commit ${c.commit.slice(0, 7)} ${c.status === "D" ? "deleted" : c.status.startsWith("R") ? "renamed" : "modified"} a raw file${c.detail ? ` (${c.detail})` : ""}`),
        );
      }
      for (const c of git.facts.rawWorkingChanges) {
        out.push(finding("RAW-IMMUTABLE", c.path, `uncommitted change (${c.status}) to a tracked raw file${c.detail ? ` (${c.detail})` : ""}`));
      }
      return out;
    }
    if (manifest?.present) {
      for (const e of manifest.entries) {
        const p = `wiki/raw/${e.path}`;
        if (e.actual === null) out.push(finding("RAW-IMMUTABLE", p, `listed in MANIFEST.sha256 line ${e.line} but missing`));
        else if (e.actual !== e.expected) out.push(finding("RAW-IMMUTABLE", p, `hash differs from MANIFEST.sha256 line ${e.line} (changed after creation)`));
      }
      for (const m of manifest.malformed) {
        out.push(finding("RAW-IMMUTABLE", MANIFEST_PATH, `line ${m.line} is not \`<64 hex>  <path>\``, { line: m.line }));
      }
      out.push(finding("RAW-IMMUTABLE", "wiki/raw/", "checked against MANIFEST.sha256 (no git history)", { severity: "info" }));
      return out;
    }
    out.push(finding("RAW-IMMUTABLE", "wiki/raw/", "RAW-IMMUTABLE not checkable yet (no git history and no MANIFEST.sha256)", { severity: "info" }));
    return out;
  },
};
