/**
 * Dashboard view model (ip-routes-and-views §3.1). Pure: reads the WikiIndex and the approvals view
 * items; the page component only renders what this returns.
 */
import type { ApprovalItem } from "../approvals/view";
import { EFFECTIVE_STATES, type Effective } from "../approvals/state";
import type { Approvals } from "../approvals/model";
import { dependencySet } from "../wiki/gates";
import type { WikiIndex } from "../wiki/load";
import type { LogEntry } from "../wiki/log";
import type { PhasePage } from "../wiki/schemas";

/** SCHEMA §6.3: the project has 9 phases, P0-P8. Progress is shown over this count. */
export const PHASE_COUNT = 9;

export interface PhaseCell {
  id: string;
  title: string;
  status: string;
  milestone: string | null;
  order: number;
  est_sessions: number;
}

export type PhaseIndex = Pick<WikiIndex, "pages">;

/** Valid phase pages sorted by `order` (then id). */
export function phases(idx: PhaseIndex): PhasePage[] {
  const out: PhasePage[] = [];
  for (const p of idx.pages) if (p.fm?.type === "phase") out.push(p.fm as PhasePage);
  return out.sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export function phaseStrip(idx: PhaseIndex): PhaseCell[] {
  return phases(idx).map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    milestone: p.milestone,
    order: p.order,
    est_sessions: p.est_sessions,
  }));
}

export interface Progress {
  done: number;
  /** Denominator: PHASE_COUNT, or the number of phase pages if larger. */
  total: number;
  sessionsDone: number;
  sessionsTotal: number;
}

export function progress(cells: readonly PhaseCell[]): Progress {
  const done = cells.filter((c) => c.status === "done");
  return {
    done: done.length,
    total: Math.max(PHASE_COUNT, cells.length),
    sessionsDone: done.reduce((s, c) => s + c.est_sessions, 0),
    sessionsTotal: cells.reduce((s, c) => s + c.est_sessions, 0),
  };
}

const TASK_ID = /\bp[0-8]\.\d+\b/;

/** "Last activity": the newest `code` log entry whose title or text mentions a task id `pN.M`. */
export function lastActivity(log: readonly LogEntry[]): (LogEntry & { task: string }) | null {
  for (let i = log.length - 1; i >= 0; i--) {
    const e = log[i];
    if (e.op !== "code") continue;
    const m = TASK_ID.exec(e.title) ?? TASK_ID.exec(e.raw);
    if (m) return { ...e, task: m[0] };
  }
  return null;
}

/** The phase after `currentId` in `order` (null when it is the last or unknown). */
export function nextPhaseId(idx: PhaseIndex, currentId: string | null | undefined): string | null {
  const list = phases(idx);
  const i = list.findIndex((p) => p.id === currentId);
  return i >= 0 && i + 1 < list.length ? list[i + 1].id : null;
}

/** Counts per effective state over the given items (every state present, zero included). */
export function stateCounts(items: readonly Pick<ApprovalItem, "state">[]): Record<Effective, number> {
  const c = Object.fromEntries(EFFECTIVE_STATES.map((s) => [s, 0])) as Record<Effective, number>;
  for (const it of items) c[it.state]++;
  return c;
}

export type BlockerKind = "status" | "phase" | "question" | "stale";

export interface Blocker {
  kind: BlockerKind;
  /** Page id, `Q-NNN` or approval key. */
  id: string;
  text: string;
}

/**
 * Blockers (§3.1 card 5): the union of STATUS `blocked_on`, phases with `status: blocked`, open
 * `Q-NNN` sections, and STALE approvals in the current or next phase's dependency set. One row per
 * (kind, id); STATUS entries come first.
 */
export function blockers(
  idx: Pick<WikiIndex, "pages" | "byId" | "status" | "openQuestions">,
  items: readonly Pick<ApprovalItem, "key" | "state">[],
): Blocker[] {
  const out: Blocker[] = [];
  const seen = new Set<string>();
  const add = (b: Blocker) => {
    const k = `${b.kind}:${b.id}`;
    if (!seen.has(k)) {
      seen.add(k);
      out.push(b);
    }
  };
  const qTitle = new Map(idx.openQuestions.map((q) => [q.id, q.title]));
  for (const id of idx.status?.blocked_on ?? []) {
    add({ kind: "status", id, text: qTitle.get(id) ?? (idx.byId.has(id) ? "named in STATUS blocked_on" : "named in STATUS blocked_on (unknown id)") });
  }
  for (const p of phases(idx)) if (p.status === "blocked") add({ kind: "phase", id: p.id, text: `phase ${p.title} is blocked` });
  for (const q of idx.openQuestions) {
    if (q.status !== "open") continue;
    const what = q.blocksAll ? "malformed section (Q-FORMAT): blocks every phase" : q.blocking.length ? `blocks ${q.blocking.join(", ")}` : "open, blocks nothing";
    add({ kind: "question", id: q.id, text: `${q.title} (${what})` });
  }
  const current = idx.status?.current_phase ?? null;
  const ids = [current, nextPhaseId(idx, current)].filter((x): x is string => !!x);
  const set = new Set<string>();
  for (const id of ids) {
    const p = idx.byId.get(id);
    if (p?.fm?.type === "phase") for (const d of dependencySet(idx, p.fm as PhasePage)) set.add(d);
  }
  for (const it of items) {
    if (it.state === "STALE" && set.has(it.key)) add({ kind: "stale", id: it.key, text: "approved, content changed since: review again" });
  }
  return out;
}

/** The approvals map for the entry-gate evaluation (an invalid file counts as no approvals; the gate then fails closed). */
export function approvalsMap(file: { valid: boolean; data: { approvals: Record<string, unknown> } | null }): Approvals {
  return (file.valid && file.data ? file.data.approvals : {}) as Approvals;
}
