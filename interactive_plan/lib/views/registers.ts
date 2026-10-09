/**
 * View models of the decision and risk registers (ip-routes-and-views §3.5, §3.6). Pure.
 */
import type { ApprovalItem } from "../approvals/view";
import { ADR_SECTIONS } from "../lint/rules/structure";
import type { WikiIndex, WikiPage } from "../wiki/load";
import type { RiskRow } from "../wiki/graph";
import type { DecisionPage } from "../wiki/schemas";

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

// ---------------------------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------------------------

export interface DecisionRow {
  id: string;
  title: string;
  status: string;
  decided_by: "owner" | "claude-proposed";
  date: string;
  state: string;
  supersedes: string[];
  superseded_by: string | null;
  /** claude-proposed and not yet approved (PENDING, STALE or CHANGES_REQUESTED): sorted first. */
  awaiting: boolean;
  path: string;
}

const AWAITING = new Set(["PENDING", "STALE", "CHANGES_REQUESTED"]);

export function decisionRows(idx: Pick<WikiIndex, "pages" | "byId">, items: readonly Pick<ApprovalItem, "key" | "state">[]): DecisionRow[] {
  const stateOf = new Map(items.map((i) => [i.key, i.state] as const));
  const rows: DecisionRow[] = [];
  for (const p of idx.pages) {
    if (p.fm?.type !== "decision" || !p.id || idx.byId.get(p.id) !== p) continue;
    const fm = p.fm as DecisionPage;
    const state = stateOf.get(fm.id) ?? (fm.approvable ? "PENDING" : "not approvable");
    rows.push({
      id: fm.id,
      title: fm.title,
      status: fm.status,
      decided_by: fm.decided_by,
      date: fm.date,
      state,
      supersedes: [...fm.supersedes],
      superseded_by: fm.superseded_by ?? null,
      awaiting: fm.decided_by === "claude-proposed" && AWAITING.has(state),
      path: p.path,
    });
  }
  return rows.sort((a, b) => Number(b.awaiting) - Number(a.awaiting) || cmp(a.id, b.id));
}

export function filterDecisions(rows: readonly DecisionRow[], f: { status?: string | null; state?: string | null }): DecisionRow[] {
  return rows.filter((r) => (!f.status || r.status === f.status) && (!f.state || r.state === f.state));
}

/** ADR body sections (SCHEMA §6.4, same list and order rule as lint ADR-SECTIONS). */
export function adrSectionCheck(page: Pick<WikiPage, "headings">): { section: string; present: boolean }[] {
  const hs = page.headings.filter((h) => h.depth === 2).map((h) => h.text);
  let pos = -1;
  return ADR_SECTIONS.map((section) => {
    const i = hs.indexOf(section, pos + 1);
    if (i >= 0) pos = i;
    return { section, present: i >= 0 };
  });
}

/**
 * The supersession chain through `id`, oldest first: follows the first `supersedes` entry backwards
 * and `superseded_by` forwards. Cycle-safe; ids without a page end the chain (shown as missing).
 */
export function supersessionChain(idx: Pick<WikiIndex, "byId">, id: string): string[] {
  const fmOf = (x: string) => {
    const fm = idx.byId.get(x)?.fm;
    return fm?.type === "decision" ? (fm as DecisionPage) : null;
  };
  const chain = [id];
  const seen = new Set(chain);
  for (let cur = fmOf(id); cur && cur.supersedes.length > 0; ) {
    const prev = cur.supersedes[0];
    if (seen.has(prev)) break;
    seen.add(prev);
    chain.unshift(prev);
    cur = fmOf(prev);
  }
  for (let cur = fmOf(id); cur?.superseded_by; ) {
    const next = cur.superseded_by;
    if (seen.has(next)) break;
    seen.add(next);
    chain.push(next);
    cur = fmOf(next);
  }
  return chain;
}

// ---------------------------------------------------------------------------------------------
// Risks
// ---------------------------------------------------------------------------------------------

export const RISK_SORT_KEYS = ["id", "title", "likelihood", "impact", "score", "status", "owner_phase", "state"] as const;
export type RiskSortKey = (typeof RISK_SORT_KEYS)[number];

export const isRiskSortKey = (v: unknown): v is RiskSortKey => typeof v === "string" && (RISK_SORT_KEYS as readonly string[]).includes(v);

/** Statuses kept by the "open + mitigating only" toggle. */
export const ACTIVE_RISK = new Set(["open", "mitigating"]);

/** Sorts the register; ties fall back to score (desc) and then id, so the order is stable. */
export function sortRisks<T extends RiskRow & { state: string }>(rows: readonly T[], key: RiskSortKey, dir: "asc" | "desc"): T[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = a[key];
    const vb = b[key];
    const c = typeof va === "number" && typeof vb === "number" ? va - vb : cmp(String(va), String(vb));
    return sign * c || b.score - a.score || cmp(a.id, b.id);
  });
}
