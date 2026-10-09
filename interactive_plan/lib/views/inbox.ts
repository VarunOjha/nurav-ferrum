/**
 * Approvals inbox view model (ip-routes-and-views §3.11). Pure: tabs, the "needs attention" default,
 * the current-wave filter, grouping by phase and the review-mode cursor.
 */
import type { ApprovalItem } from "../approvals/view";
import type { Effective } from "../approvals/state";
import { dependencySet } from "../wiki/gates";
import type { WikiIndex } from "../wiki/load";
import type { PhasePage } from "../wiki/schemas";
import { nextPhaseId, phases } from "./dashboard";
import { exitBarVisible } from "./phase";

export const TABS = [
  { id: "needs", label: "Needs attention", states: ["PENDING", "STALE", "CHANGES_REQUESTED"] },
  { id: "wave", label: "Current wave", states: null },
  { id: "all", label: "All", states: null },
  { id: "pending", label: "Pending", states: ["PENDING"] },
  { id: "stale", label: "Stale", states: ["STALE"] },
  { id: "changes", label: "Changes requested", states: ["CHANGES_REQUESTED"] },
  { id: "approved", label: "Approved", states: ["APPROVED", "APPROVED_VOLATILE_DRIFT"] },
  { id: "rejected", label: "Rejected", states: ["REJECTED"] },
  { id: "invalid", label: "Invalid", states: ["INVALID"] },
] as const satisfies readonly { id: string; label: string; states: readonly Effective[] | null }[];

export type TabId = (typeof TABS)[number]["id"];

/** Above this many "needs attention" keys the inbox opens on the current wave (§3.11 "about 30"). */
export const WAVE_DEFAULT_THRESHOLD = 30;

/** `?state=` values from the dashboard counts map onto a tab. */
const STATE_TO_TAB: Record<string, TabId> = {
  PENDING: "pending",
  STALE: "stale",
  APPROVED_VOLATILE_DRIFT: "approved",
  CHANGES_REQUESTED: "changes",
  APPROVED: "approved",
  REJECTED: "rejected",
  INVALID: "invalid",
};

/**
 * The approvables the inbox, the dashboard counts and the top-bar counter work on (§3.11): every
 * page key, plus a `#exit` key only when it is eligible (phase in gate-review/done, or a record
 * exists). A planned phase's exit key is not something the owner can act on yet.
 */
export function eligibleItems<T extends Pick<ApprovalItem, "exit" | "page_status" | "record">>(items: readonly T[]): T[] {
  return items.filter((it) => !it.exit || exitBarVisible(it.page_status, it.record !== null));
}

/** The top-bar counter: PENDING + STALE + CHANGES_REQUESTED over the eligible keys (ip-routes-and-views §2). */
export function needsAttentionCount(items: readonly Pick<ApprovalItem, "exit" | "page_status" | "record" | "state">[]): number {
  return eligibleItems(items).filter((i) => i.state === "PENDING" || i.state === "STALE" || i.state === "CHANGES_REQUESTED").length;
}

export const isTab = (s: string | null | undefined): s is TabId => !!s && TABS.some((t) => t.id === s);

/**
 * The phase whose entry gate defines the current wave: the phase after STATUS.current_phase
 * (ops-approval-workflow §8), or the current phase if it is the last one.
 */
export function wavePhase(idx: Pick<WikiIndex, "pages" | "status">): string | null {
  const cur = idx.status?.current_phase ?? null;
  return nextPhaseId(idx, cur) ?? cur;
}

/** Keys of the current wave: the dependency set of the wave phase's entry gate (its exit key is not part of it). */
export function waveKeys(idx: Pick<WikiIndex, "pages" | "byId" | "status">): Set<string> {
  const id = wavePhase(idx);
  const p = id ? idx.byId.get(id) : undefined;
  return new Set(p?.fm?.type === "phase" ? dependencySet(idx, p.fm as PhasePage) : []);
}

export function filterItems<T extends Pick<ApprovalItem, "key" | "state">>(items: readonly T[], tab: TabId, wave: ReadonlySet<string>): T[] {
  if (tab === "all") return [...items];
  if (tab === "wave") return items.filter((i) => wave.has(i.key));
  const def = TABS.find((t) => t.id === tab)!;
  const states = new Set<string>(def.states ?? []);
  return items.filter((i) => states.has(i.state));
}

/** The tab to show: `?tab=`, else `?state=`, else "needs attention" (or the current wave when that list is long). */
export function chooseTab(
  q: { tab?: string | null; state?: string | null },
  items: readonly Pick<ApprovalItem, "key" | "state">[],
  wave: ReadonlySet<string>,
): TabId {
  if (isTab(q.tab)) return q.tab;
  const st = q.state?.trim().toUpperCase();
  if (st && STATE_TO_TAB[st]) return STATE_TO_TAB[st];
  const needs = filterItems(items, "needs", wave).length;
  return needs > WAVE_DEFAULT_THRESHOLD && wave.size > 0 ? "wave" : "needs";
}

export interface InboxGroup {
  /** Phase id, or null for "Cross-cutting". */
  phase: string | null;
  title: string;
  items: ApprovalItem[];
}

/**
 * Groups by phase (§3.11): a phase page and its exit key go under that phase; a page with a `phase`
 * field under that phase; otherwise the first phase (by order) whose dependency set holds the id;
 * the rest under "Cross-cutting". Groups follow phase order; Cross-cutting comes last.
 */
export function groupByPhase(idx: Pick<WikiIndex, "pages" | "byId">, items: readonly ApprovalItem[]): InboxGroup[] {
  const ordered = phases(idx);
  const sets = ordered.map((p) => ({ id: p.id, title: p.title, set: new Set(dependencySet(idx, p)) }));
  const groups = new Map<string | null, ApprovalItem[]>();
  for (const it of items) {
    const page = idx.byId.get(it.id);
    const fm = (page?.fm ?? null) as { type?: string; phase?: string } | null;
    let g: string | null = null;
    if (fm?.type === "phase") g = it.id;
    else if (fm?.phase && sets.some((s) => s.id === fm.phase)) g = fm.phase;
    else g = sets.find((s) => s.set.has(it.id))?.id ?? null;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(it);
  }
  const out: InboxGroup[] = [];
  for (const s of sets) {
    const list = groups.get(s.id);
    if (list?.length) out.push({ phase: s.id, title: s.title, items: list });
  }
  const rest = groups.get(null);
  if (rest?.length) out.push({ phase: null, title: "Cross-cutting", items: rest });
  return out;
}

/** Review-mode cursor: clamps `i` into the list; prev/next indexes or null at the ends. */
export function reviewCursor(length: number, raw: string | null | undefined): { i: number; prev: number | null; next: number | null } | null {
  if (length === 0) return null;
  const n = raw && /^\d+$/.test(raw) ? Number(raw) : 0;
  const i = Math.min(Math.max(n, 0), length - 1);
  return { i, prev: i > 0 ? i - 1 : null, next: i + 1 < length ? i + 1 : null };
}

/** Short text for the "last decision" column. */
export function lastDecision(rec: Record<string, unknown> | null): { status: string; timestamp: string; comment: string } | null {
  if (!rec || typeof rec.status !== "string") return null;
  const comment = typeof rec.comment === "string" ? rec.comment.replace(/\s+/g, " ").trim() : "";
  return {
    status: rec.status,
    timestamp: typeof rec.timestamp === "string" ? rec.timestamp : "",
    comment: comment.length > 80 ? comment.slice(0, 79) + "…" : comment,
  };
}
