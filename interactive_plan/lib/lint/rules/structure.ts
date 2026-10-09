/**
 * Cross-page structure rules (ip-wiki-lint §2, §2.1; SCHEMA §6, §9.3, §10.4): ADR-CHAIN, PHASE-ORDER,
 * TRUST-EDGE, HYP-NO-DATA, Q-BLOCK-UNGATED, PHASE-DONE-NO-EXIT and the per-type section/field checks
 * ADR-SECTIONS, HANDOFF-SECTIONS, COMP-UNSAFE, COMP-LVC, EXP-RESULTS, RISK-SCORE. Only zod-valid
 * frontmatter is inspected (an invalid page already has FM-* findings).
 */
import { countsAsApproved, stateOf } from "../../approvals/state";
import { finding, type LintFinding } from "../../wiki/findings";
import { dependencySet } from "../../wiki/gates";
import type { WikiIndex, WikiPage } from "../../wiki/load";
import type { ComponentPage, DecisionPage, Page } from "../../wiki/schemas";
import type { Rule } from "../types";
import { phasePages } from "../util";

type Of<T extends Page["type"]> = Extract<Page, { type: T }>;
function valid<T extends Page["type"]>(idx: WikiIndex, type: T): (WikiPage & { fm: Of<T> })[] {
  return idx.pages.filter((p): p is WikiPage & { fm: Of<T> } => p.fm?.type === type && idx.byId.get(p.fm.id) === p);
}

export const adrChain: Rule = {
  code: "ADR-CHAIN",
  severity: "error",
  run({ idx, approvals }) {
    const out: LintFinding[] = [];
    const adrs = new Map(valid(idx, "decision").map((p) => [p.fm.id, p] as const));
    for (const p of adrs.values()) {
      const fm = p.fm as DecisionPage;
      if (fm.status === "superseded" && !fm.superseded_by) {
        out.push(finding("ADR-CHAIN", p.repoPath, `${fm.id} is superseded but has no superseded_by`, { id: fm.id }));
      }
      // SCHEMA §9.4 step 2: the old ADR is marked superseded once the new one is accepted, so the
      // "A supersedes B but B is not superseded" check applies to accepted ADRs (decided 2026-10-09, IP-5).
      if (fm.status === "accepted") {
        for (const b of fm.supersedes) {
          const bp = adrs.get(b);
          if (bp && bp.fm.status !== "superseded") {
            out.push(finding("ADR-CHAIN", p.repoPath, `${fm.id} supersedes ${b}, but ${b} has status ${bp.fm.status}`, { id: fm.id }));
          }
        }
        // SCHEMA §10.4.3: approval counts as approved, or decided_by owner with a raw/ source.
        const approved = countsAsApproved(stateOf(fm.id, approvals.approvals, idx));
        const ownerRaw = fm.decided_by === "owner" && fm.sources.some((s) => s.startsWith("raw/"));
        if (!approved && !ownerRaw) {
          out.push(
            finding("ADR-CHAIN", p.repoPath, `${fm.id} is accepted without an approval and without decided_by: owner plus a raw/ source (SCHEMA §10.4.3)`, {
              id: fm.id,
            }),
          );
        }
      }
    }
    return out;
  },
};

export const phaseOrder: Rule = {
  code: "PHASE-ORDER",
  severity: "error",
  run({ idx }) {
    const out: LintFinding[] = [];
    const phases = phasePages(idx).filter((p) => idx.byId.get(p.fm.id) === p);
    const byId = new Map(phases.map((p) => [p.fm.id, p] as const));
    const byOrder = new Map<number, string[]>();
    for (const p of phases) {
      const { id, order } = p.fm;
      byOrder.set(order, [...(byOrder.get(order) ?? []), id]);
      const n = /^phase-p(\d)-/.exec(id);
      if (n && Number(n[1]) !== order) out.push(finding("PHASE-ORDER", p.repoPath, `order ${order} differs from the N in ${id}`, { id }));
      for (const d of p.fm.depends_on) {
        const dp = byId.get(d);
        if (dp && dp.fm.order >= order) {
          out.push(finding("PHASE-ORDER", p.repoPath, `depends on ${d} whose order ${dp.fm.order} is not lower than ${order}`, { id }));
        }
      }
    }
    for (const [order, ids] of byOrder) {
      if (ids.length > 1) for (const id of ids) out.push(finding("PHASE-ORDER", byId.get(id)!.repoPath, `order ${order} is shared by ${ids.join(", ")}`, { id }));
    }
    // Cycles (DFS, white/grey/black); each phase on a cycle is reported once.
    const colour = new Map<string, 0 | 1 | 2>();
    const onCycle = new Set<string>();
    const stack: string[] = [];
    const visit = (id: string) => {
      colour.set(id, 1);
      stack.push(id);
      for (const d of byId.get(id)!.fm.depends_on) {
        if (!byId.has(d)) continue;
        const c = colour.get(d) ?? 0;
        if (c === 1) for (const x of stack.slice(stack.indexOf(d))) onCycle.add(x);
        else if (c === 0) visit(d);
      }
      stack.pop();
      colour.set(id, 2);
    };
    for (const id of [...byId.keys()].sort()) if ((colour.get(id) ?? 0) === 0) visit(id);
    for (const id of [...onCycle].sort()) out.push(finding("PHASE-ORDER", byId.get(id)!.repoPath, `${id} is on a depends_on cycle`, { id }));
    // Task ids are unique across all phases.
    const tasks = new Map<string, string[]>();
    for (const p of phases) for (const t of p.fm.tasks) tasks.set(t.id, [...(tasks.get(t.id) ?? []), p.fm.id]);
    for (const [t, owners] of tasks) {
      if (owners.length > 1) {
        for (const id of new Set(owners)) out.push(finding("PHASE-ORDER", byId.get(id)!.repoPath, `task id ${t} is defined ${owners.length} times (${owners.join(", ")})`, { id }));
      }
    }
    return out;
  },
};

export const trustEdge: Rule = {
  code: "TRUST-EDGE",
  severity: "error",
  run({ idx }) {
    const out: LintFinding[] = [];
    const comps = new Map(valid(idx, "component").map((p) => [p.fm.id, p] as const));
    for (const p of comps.values()) {
      const fm = p.fm as ComponentPage;
      for (const e of fm.connects) {
        const to = comps.get(e.to);
        if (!to) continue; // REF-DANGLING
        const differ = fm.trust_level !== to.fm.trust_level;
        if (e.crosses_trust_boundary !== differ) {
          out.push(
            finding(
              "TRUST-EDGE",
              p.repoPath,
              `edge ${fm.id} → ${e.to} (${e.label}): crosses_trust_boundary is ${e.crosses_trust_boundary}, but the trust levels are ${fm.trust_level} → ${to.fm.trust_level}`,
              { id: fm.id },
            ),
          );
        }
      }
    }
    return out;
  },
};

const VERDICTS = new Set(["supported", "not-supported", "inconclusive"]);

export const hypNoData: Rule = {
  code: "HYP-NO-DATA",
  severity: "error",
  run({ idx }) {
    const out: LintFinding[] = [];
    for (const p of valid(idx, "hypothesis")) {
      if (!VERDICTS.has(p.fm.status)) continue;
      const backed = p.fm.experiments.some((e) => {
        const ep = idx.byId.get(e);
        const efm = ep?.fm?.type === "experiment" ? ep.fm : null;
        return !!efm && efm.status === "analyzed" && (efm.results_ref ?? []).some((r) => r.startsWith("raw/bench/"));
      });
      if (!backed) {
        out.push(
          finding("HYP-NO-DATA", p.repoPath, `${p.fm.id} has status ${p.fm.status} but no analyzed experiment with results_ref into raw/bench/`, {
            id: p.fm.id,
          }),
        );
      }
    }
    return out;
  },
};

export const qBlockUngated: Rule = {
  code: "Q-BLOCK-UNGATED",
  severity: "warn",
  run({ idx }) {
    const oq = idx.byId.get("ov-open-questions");
    if (!oq) return [];
    const gated = new Set<string>();
    for (const p of phasePages(idx)) for (const id of dependencySet(idx, p.fm)) gated.add(id);
    const out: LintFinding[] = [];
    // Open questions only: an answered or withdrawn question gates nothing whatever its list says.
    for (const q of idx.openQuestions) {
      if (q.status !== "open" || q.blocksAll) continue;
      const ungated = q.blocking.filter((b) => !gated.has(b));
      if (ungated.length > 0) {
        out.push(
          finding("Q-BLOCK-UNGATED", oq.repoPath, `${q.id} blocks ${ungated.join(", ")}, which is in no phase's dependency set (list the phase id instead)`, {
            id: oq.id ?? undefined,
            line: q.line,
          }),
        );
      }
    }
    return out;
  },
};

export const phaseDoneNoExit: Rule = {
  code: "PHASE-DONE-NO-EXIT",
  severity: "warn",
  run({ idx, approvals }) {
    return phasePages(idx)
      .filter((p) => p.fm.status === "done" && !countsAsApproved(stateOf(`${p.fm.id}#exit`, approvals.approvals, idx)))
      .map((p) =>
        finding("PHASE-DONE-NO-EXIT", p.repoPath, `${p.fm.id} has status done but ${p.fm.id}#exit is not approved`, { id: p.fm.id }),
      );
  },
};

/** `##` headings of a page, in order. */
const h2 = (p: WikiPage) => p.headings.filter((h) => h.depth === 2).map((h) => h.text);

export const ADR_SECTIONS = ["Context", "Options considered", "Decision", "Consequences", "Verification / evidence"] as const;
export const HANDOFF_SECTIONS = ["Done", "In progress", "Next", "Blockers", "Notes for next session"] as const;

export const adrSections: Rule = {
  code: "ADR-SECTIONS",
  severity: "warn",
  run({ idx }) {
    const out: LintFinding[] = [];
    for (const p of valid(idx, "decision")) {
      const hs = h2(p);
      let pos = -1;
      const missing: string[] = [];
      for (const s of ADR_SECTIONS) {
        const i = hs.indexOf(s, pos + 1);
        if (i < 0) missing.push(s);
        else pos = i;
      }
      if (missing.length > 0) {
        out.push(
          finding("ADR-SECTIONS", p.repoPath, `missing or out of order: ${missing.map((s) => `## ${s}`).join(", ")} (SCHEMA §6.4)`, { id: p.fm.id }),
        );
      }
    }
    return out;
  },
};

export const handoffSections: Rule = {
  code: "HANDOFF-SECTIONS",
  severity: "warn",
  run({ idx }) {
    const out: LintFinding[] = [];
    for (const p of valid(idx, "handoff")) {
      const hs = new Set(h2(p));
      const missing = HANDOFF_SECTIONS.filter((s) => !hs.has(s));
      if (missing.length > 0) {
        out.push(finding("HANDOFF-SECTIONS", p.repoPath, `missing: ${missing.map((s) => `## ${s}`).join(", ")} (SCHEMA §6.15)`, { id: p.fm.id }));
      }
    }
    return out;
  },
};

export const compUnsafe: Rule = {
  code: "COMP-UNSAFE",
  severity: "warn",
  run({ idx }) {
    return valid(idx, "component")
      .filter((p) => p.fm.unsafe_code === true && !h2(p).includes("Unsafe invariants"))
      .map((p) => finding("COMP-UNSAFE", p.repoPath, "unsafe_code: true requires a `## Unsafe invariants` section (SCHEMA §6.2)", { id: p.fm.id }));
  },
};

/** SCHEMA §6.2 "status ≥ implemented": implemented and verified (deprecated is not a later stage of the same build; decided 2026-10-09, IP-5). */
const IMPLEMENTED = new Set(["implemented", "verified"]);

export const compLvc: Rule = {
  code: "COMP-LVC",
  severity: "warn",
  run({ idx }) {
    return valid(idx, "component")
      .filter((p) => IMPLEMENTED.has(p.fm.status) && !p.fm.last_verified_commit)
      .map((p) => finding("COMP-LVC", p.repoPath, `status ${p.fm.status} requires last_verified_commit (SCHEMA §6.2)`, { id: p.fm.id }));
  },
};

export const expResults: Rule = {
  code: "EXP-RESULTS",
  severity: "warn",
  run({ idx }) {
    return valid(idx, "experiment")
      .filter((p) => (p.fm.status === "complete" || p.fm.status === "analyzed") && (p.fm.results_ref ?? []).length === 0)
      .map((p) => finding("EXP-RESULTS", p.repoPath, `status ${p.fm.status} requires results_ref (SCHEMA §6.8)`, { id: p.fm.id }));
  },
};

export const riskScore: Rule = {
  code: "RISK-SCORE",
  severity: "warn",
  run({ idx }) {
    return valid(idx, "risk")
      .filter((p) => p.fm.score !== undefined && p.fm.score !== p.fm.likelihood * p.fm.impact)
      .map((p) =>
        finding("RISK-SCORE", p.repoPath, `score ${p.fm.score} differs from likelihood × impact = ${p.fm.likelihood * p.fm.impact} (SCHEMA §6.5)`, {
          id: p.fm.id,
        }),
      );
  },
};
