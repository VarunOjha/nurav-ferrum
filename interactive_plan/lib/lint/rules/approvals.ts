/**
 * Approval rules (ip-wiki-lint §2, §2.1; SCHEMA §10.3, §10.4.5): APPROVAL-STALE, APPROVAL-INVALID,
 * STATUS-APPROVED. Read-only: approvals.json is read by the caller and passed in the context.
 */
import { countsAsApproved, pageIdOfKey, stateOf } from "../../approvals/state";
import { finding, type LintFinding } from "../../wiki/findings";
import { dependencySet } from "../../wiki/gates";
import type { WikiIndex } from "../../wiki/load";
import type { Rule } from "../types";
import { phasePages } from "../util";

/** Ids in the dependency sets of STATUS.current_phase and of its direct successors (phases depending on it). */
export function currentAndNextSets(idx: WikiIndex): Set<string> {
  const out = new Set<string>();
  const cur = idx.status?.current_phase;
  if (!cur) return out;
  for (const p of phasePages(idx)) {
    if (p.fm.id === cur || p.fm.depends_on.includes(cur)) for (const id of dependencySet(idx, p.fm)) out.add(id);
  }
  return out;
}

export const approvalStale: Rule = {
  code: "APPROVAL-STALE",
  severity: "info",
  run({ idx, approvals }) {
    const out: LintFinding[] = [];
    if (!approvals.valid) return out;
    const near = currentAndNextSets(idx);
    for (const key of Object.keys(approvals.approvals).sort()) {
      if (stateOf(key, approvals.approvals, idx) !== "STALE") continue;
      const id = pageIdOfKey(key);
      const page = idx.byId.get(id)!;
      const severity = near.has(id) ? "warn" : "info";
      const where = severity === "warn" ? " (in the dependency set of the current or next phase: re-approve before dependent work)" : "";
      out.push(finding("APPROVAL-STALE", page.repoPath, `approval of ${key} is STALE${where}`, { id, severity }));
    }
    return out;
  },
};

export const approvalInvalid: Rule = {
  code: "APPROVAL-INVALID",
  severity: "error",
  run({ idx, approvals, approvalsPath }) {
    if (!approvals.valid) {
      return [finding("APPROVAL-INVALID", approvalsPath, `approvals file is invalid (${approvals.error ?? "unknown error"}); every state reads INVALID`)];
    }
    const out: LintFinding[] = [];
    for (const key of Object.keys(approvals.approvals).sort()) {
      if (stateOf(key, approvals.approvals, idx) !== "INVALID") continue;
      const page = idx.byId.get(pageIdOfKey(key));
      const why = !page ? "no page has this id" : !page.fm ? "the page frontmatter is invalid" : page.fm.approvable !== true ? "the page is not approvable" : key.endsWith("#exit") ? "#exit keys exist only for phases" : "the page is unhashable";
      out.push(finding("APPROVAL-INVALID", approvalsPath, `approval key ${key}: ${why} (SCHEMA §10.3)`));
    }
    return out;
  },
};

export const statusApproved: Rule = {
  code: "STATUS-APPROVED",
  severity: "warn",
  run({ idx, approvals }) {
    const out: LintFinding[] = [];
    for (const p of idx.pages) {
      const fm = p.fm;
      if (!fm || (fm.type !== "overview" && fm.type !== "schema") || fm.status !== "approved") continue;
      if (!countsAsApproved(stateOf(fm.id, approvals.approvals, idx))) {
        out.push(finding("STATUS-APPROVED", p.repoPath, `status: approved, but the approval state of ${fm.id} does not count as approved (SCHEMA §10.4.5)`, { id: fm.id }));
      }
    }
    return out;
  },
};
