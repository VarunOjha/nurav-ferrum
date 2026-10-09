/**
 * Phase entry-gate evaluation (ip-data-contract §8.3; SCHEMA §9.7 steps 1-4). The app only
 * reports: it never changes a phase `status` (Claude does that per SCHEMA §9.7 and logs it).
 * Mirrors `--gate` of tools/approvals_check.py. Pure: reads the WikiIndex and the approvals map.
 */
import type { Approvals } from "../approvals/model";
import { countsAsApproved, stateOf, type Effective } from "../approvals/state";
import type { WikiIndex, WikiPage } from "./load";
import type { PhasePage } from "./schemas";

/** SCHEMA §9.7 "P0 bootstrap exception": no approval-based entry gate for this phase. */
export const BOOTSTRAP_PHASE = "phase-p0-planning";

export type GateCheck =
  | "phase-exists"
  | "dependencies-done"
  | "dependency-set-approved"
  | "no-blocking-questions"
  | "no-unregistered-contradictions";

export interface GateItem {
  check: GateCheck;
  ok: boolean;
  /** Ids that fail the check (for contradictions: `<page-id>:<line>`). */
  ids: string[];
  /** Per-id detail shown by the UI, e.g. `STALE`, `status planned, exit PENDING`, `Q-FORMAT`. */
  details: { id: string; detail: string }[];
}

export interface EntryGate {
  phaseId: string;
  /** The SCHEMA §9.7 dependency set (sorted). Empty when the phase does not exist. */
  dependencySet: string[];
  items: GateItem[];
  /** True for the P0 bootstrap exception: `ok` is true whatever the items say (they stay informative). */
  bootstrapException: boolean;
  /** Overall: every item ok (or the bootstrap exception). */
  ok: boolean;
}

export type GateIndex = Pick<WikiIndex, "byId" | "pages" | "openQuestions" | "bootstrapHash">;

const CONTRADICTION = /^> \*\*CONTRADICTION:\*\*/;

/** Open `> **CONTRADICTION:**` blockquotes of a page: 1-based file line and the Q ids named in the quote. */
export function contradictions(page: Pick<WikiPage, "body" | "bodyStartLine">): { line: number; questions: string[] }[] {
  const lines = page.body.split("\n");
  const out: { line: number; questions: string[] }[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!CONTRADICTION.test(lines[i])) continue;
    const quote = [lines[i]];
    let j = i + 1;
    while (j < lines.length && lines[j].startsWith(">")) quote.push(lines[j++]);
    const qs = [...new Set(quote.join(" ").match(/Q-\d{3}/g) ?? [])].sort();
    out.push({ line: page.bodyStartLine + i, questions: qs });
  }
  return out;
}

/** SCHEMA §9.7 step 2: P, its decisions, components introduced in or listed by P, its experiments, `schema`. */
export function dependencySet(idx: Pick<WikiIndex, "pages">, phase: PhasePage): string[] {
  const set = new Set<string>([phase.id, "schema", ...phase.decisions, ...phase.experiments, ...(phase.components ?? [])]);
  for (const p of idx.pages) {
    if (p.fm?.type === "component" && p.fm.phase_introduced === phase.id) set.add(p.fm.id);
  }
  return [...set].sort();
}

const item = (check: GateCheck, details: { id: string; detail: string }[]): GateItem => ({
  check,
  ok: details.length === 0,
  ids: details.map((d) => d.id),
  details,
});

export function entryGate(
  idx: GateIndex,
  approvals: Approvals,
  phaseId: string,
  opts: { bootstrapPhase?: string } = {},
): EntryGate {
  const bootstrapException = phaseId === (opts.bootstrapPhase ?? BOOTSTRAP_PHASE);
  const page = idx.byId.get(phaseId);
  if (!page?.fm || page.fm.type !== "phase") {
    const items = [item("phase-exists", [{ id: phaseId, detail: page ? "not a valid phase page" : "no such page" }])];
    return { phaseId, dependencySet: [], items, bootstrapException, ok: false };
  }
  const phase = page.fm as PhasePage;
  const state = (key: string): Effective => stateOf(key, approvals, idx);

  // 1. Dependencies done: status done and the #exit approval counts as approved.
  const deps: { id: string; detail: string }[] = [];
  for (const d of phase.depends_on) {
    const dp = idx.byId.get(d);
    const status = dp?.fm && "status" in dp.fm ? String(dp.fm.status) : "missing";
    const exit = state(`${d}#exit`);
    if (status !== "done" || !countsAsApproved(exit)) deps.push({ id: d, detail: `status ${status}, exit ${exit}` });
  }

  // 2. Dependency set approved.
  const set = dependencySet(idx, phase);
  const unapproved = set
    .map((id) => ({ id, detail: state(id) as string }))
    .filter((d) => !countsAsApproved(d.detail as Effective));

  // 3. No open question blocking an id of the set; a malformed section (Q-FORMAT) blocks every phase.
  const inSet = new Set(set);
  const blocking = idx.openQuestions
    .filter((q) => q.status === "open" && (q.blocksAll || q.blocking.some((b) => inSet.has(b))))
    .map((q) => ({
      id: q.id,
      detail: q.blocksAll ? "Q-FORMAT: treated as open, blocking every phase" : `blocks ${q.blocking.filter((b) => inSet.has(b)).join(", ")}`,
    }));

  // 4. No unregistered CONTRADICTION blockquote on a page of the set. A quote naming a Q id that is in
  //    the register is registered (that question's `blocking` list decides, step 3).
  const register = new Set(idx.openQuestions.map((q) => q.id));
  const unregistered: { id: string; detail: string }[] = [];
  for (const id of set) {
    const p = idx.byId.get(id);
    if (!p) continue;
    for (const c of contradictions(p)) {
      if (!c.questions.some((q) => register.has(q))) {
        unregistered.push({ id: `${id}:${c.line}`, detail: `${p.repoPath}:${c.line} names no registered Q-NNN` });
      }
    }
  }

  const items = [
    item("dependencies-done", deps),
    item("dependency-set-approved", unapproved),
    item("no-blocking-questions", blocking),
    item("no-unregistered-contradictions", unregistered),
  ];
  return { phaseId, dependencySet: set, items, bootstrapException, ok: bootstrapException || items.every((i) => i.ok) };
}
