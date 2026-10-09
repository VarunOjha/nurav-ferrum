/**
 * Effective approval state (ip-data-contract §8.2; exactly SCHEMA §10.3, plus the §10.2
 * bootstrap_hash rule for key `schema`). Computed, never stored. Pure: reads only the WikiIndex.
 */
import type { WikiIndex, WikiPage } from "../wiki/load";
import type { ApprovalRecord, Approvals } from "./model";

export const EFFECTIVE_STATES = [
  "PENDING",
  "APPROVED",
  "APPROVED_VOLATILE_DRIFT",
  "STALE",
  "CHANGES_REQUESTED",
  "REJECTED",
  "INVALID",
] as const;
export type Effective = (typeof EFFECTIVE_STATES)[number];

/** The parts of a WikiIndex the state needs (tests can pass a minimal object). */
export type StateIndex = Pick<WikiIndex, "byId" | "bootstrapHash">;

/** The key whose record also carries `bootstrap_hash` (SCHEMA §10.2). */
export const BOOTSTRAP_KEY = "schema";

export const pageIdOfKey = (key: string): string => key.replace(/#exit$/, "");
export const isExitKey = (key: string): boolean => key.endsWith("#exit");

export function effectiveState(key: string, rec: ApprovalRecord | undefined, idx: StateIndex): Effective {
  const page = idx.byId.get(pageIdOfKey(key));
  if (!page || !page.fm || page.fm.approvable !== true) return "INVALID";
  if (isExitKey(key) && page.fm.type !== "phase") return "INVALID";
  if (page.contentHash === null || page.scopeHash === null) return "INVALID"; // unhashable (§6.3)
  if (!rec) return "PENDING";
  if (rec.status === "rejected") return "REJECTED";
  if (rec.status === "changes-requested") return "CHANGES_REQUESTED";
  // SCHEMA §10.2: CLAUDE.md drift stales `schema`; scope-hash drift does not apply to it. A stored
  // bootstrap_hash with CLAUDE.md missing counts as drift (fail closed). A record without
  // bootstrap_hash (never written by the app) is judged on the page hashes alone, as in
  // tools/approvals_check.py.
  if (key === BOOTSTRAP_KEY && rec.bootstrap_hash !== undefined && rec.bootstrap_hash !== idx.bootstrapHash) {
    return "STALE";
  }
  if (rec.content_hash === page.contentHash) return "APPROVED";
  if (rec.scope_hash === page.scopeHash) return "APPROVED_VOLATILE_DRIFT";
  return "STALE";
}

export const countsAsApproved = (e: Effective): boolean => e === "APPROVED" || e === "APPROVED_VOLATILE_DRIFT";

export interface ApprovalView {
  key: string;
  state: Effective;
  page: WikiPage | null;
  rec: ApprovalRecord | null;
  /** The record's path differs from the page's current repo path (renamed file; state unaffected). */
  moved: boolean;
  /** A stored key with no approvable page (listed as "orphaned approvals"; never deleted). */
  orphaned: boolean;
}

export function describeApproval(key: string, rec: ApprovalRecord | undefined, idx: StateIndex): ApprovalView {
  const page = idx.byId.get(pageIdOfKey(key)) ?? null;
  const state = effectiveState(key, rec, idx);
  return {
    key,
    state,
    page,
    rec: rec ?? null,
    moved: !!(rec && page && rec.path !== page.repoPath),
    orphaned: !!rec && state === "INVALID",
  };
}

/** State of a key in an approvals map (missing key = PENDING when the page is approvable). */
export function stateOf(key: string, approvals: Approvals, idx: StateIndex): Effective {
  return effectiveState(key, Object.hasOwn(approvals, key) ? approvals[key] : undefined, idx);
}
