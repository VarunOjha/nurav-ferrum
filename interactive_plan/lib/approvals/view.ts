/**
 * GET /api/approvals merged view (ip-approvals-api §1): every approvable key with its stored record
 * and computed state, orphaned records and per-state counts. Side-effect free.
 */
import path from "node:path";
import type { PlanConfig } from "../config";
import { loadWiki, type WikiPage } from "../wiki/load";
import { Rec } from "./model";
import { countsAsApproved, effectiveState, EFFECTIVE_STATES, pageIdOfKey, type Effective, type StateIndex } from "./state";
import { localIso } from "./time";
import { readApprovals } from "./file";
import { withMutex } from "./lock";

export interface ApprovalItem {
  key: string;
  id: string;
  exit: boolean;
  type: string | null;
  title: string | null;
  path: string;
  page_status: string | null;
  current: { content_hash: string | null; scope_hash: string | null };
  /** The stored record verbatim, or null. */
  record: Record<string, unknown> | null;
  state: Effective;
  counts_as_approved: boolean;
  moved: boolean;
}

export interface ApprovalsView {
  schema_version: 1;
  generated_at: string;
  file: { path: string; exists: boolean; valid: boolean; error: string | null };
  readonly: boolean;
  items: ApprovalItem[];
  orphans: { key: string; record: unknown }[];
  counts: Record<Effective, number>;
}

export interface ViewQuery {
  key?: string | null;
  /** Comma-separated effective states. */
  state?: string | null;
  phase?: string | null;
}

const fmOf = (p: WikiPage): Record<string, unknown> =>
  (p.fm ?? (p.rawFm && typeof p.rawFm === "object" ? p.rawFm : {})) as Record<string, unknown>;
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

/** One item; `invalidFile` forces INVALID (an approvals.json that cannot be parsed, ip-data-contract §8.1). */
export function buildItem(
  key: string,
  page: WikiPage,
  record: Record<string, unknown> | null,
  idx: StateIndex,
  invalidFile = false,
): ApprovalItem {
  const fm = fmOf(page);
  const parsed = record ? Rec.safeParse(record) : null;
  let state: Effective;
  if (invalidFile || (parsed && !parsed.success)) state = "INVALID";
  else state = effectiveState(key, parsed?.success ? parsed.data : undefined, idx);
  return {
    key,
    id: pageIdOfKey(key),
    exit: key.endsWith("#exit"),
    type: str(fm.type),
    title: str(fm.title),
    path: page.repoPath,
    page_status: str(fm.status),
    current: { content_hash: page.contentHash, scope_hash: page.scopeHash },
    record,
    state,
    counts_as_approved: countsAsApproved(state),
    moved: !!record && typeof record.path === "string" && record.path !== page.repoPath,
  };
}

const isApprovablePage = (p: WikiPage) => p.id !== null && fmOf(p).approvable === true;

export type ViewConfig = Pick<PlanConfig, "wikiDir" | "statusFile" | "repoRoot" | "dataDir" | "approvalsFile" | "readonly">;

export async function getView(cfg: ViewConfig, q: ViewQuery = {}): Promise<ApprovalsView> {
  const [idx, file] = await Promise.all([
    loadWiki(cfg),
    withMutex(path.join(cfg.dataDir, ".approvals.lock"), () => readApprovals(cfg.approvalsFile)),
  ]);
  const approvals = file.data?.approvals ?? {};
  const invalid = !file.valid;
  const items: ApprovalItem[] = [];
  const seen = new Set<string>();
  const pages = idx.pages.filter(isApprovablePage).sort((a, b) => (a.id! < b.id! ? -1 : a.id! > b.id! ? 1 : 0));
  for (const p of pages) {
    if (idx.byId.get(p.id!) !== p) continue; // duplicate id: the first file wins (ID-DUP is a lint error)
    const keys = fmOf(p).type === "phase" ? [p.id!, `${p.id}#exit`] : [p.id!];
    for (const key of keys) {
      seen.add(key);
      const rec = Object.hasOwn(approvals, key) ? approvals[key] : null;
      items.push(buildItem(key, p, rec, idx, invalid));
    }
  }
  const orphans = Object.keys(approvals)
    .filter((k) => !seen.has(k))
    .sort()
    .map((key) => ({ key, record: approvals[key] }));

  const states = q.state
    ? new Set(
        q.state
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean),
      )
    : null;
  const filtered = items.filter((it) => {
    if (q.key && it.key !== q.key) return false;
    if (states && !states.has(it.state)) return false;
    if (q.phase) {
      const p = idx.byId.get(it.id);
      if (it.id !== q.phase && (p ? fmOf(p).phase : undefined) !== q.phase) return false;
    }
    return true;
  });
  const counts = Object.fromEntries(EFFECTIVE_STATES.map((s) => [s, 0])) as Record<Effective, number>;
  for (const it of filtered) counts[it.state]++;

  const rel = path.relative(cfg.repoRoot, cfg.approvalsFile).split(path.sep).join("/");
  return {
    schema_version: 1,
    generated_at: localIso(),
    file: {
      path: rel.startsWith("..") || path.isAbsolute(rel) ? cfg.approvalsFile.split(path.sep).join("/") : rel,
      exists: file.exists,
      valid: file.valid,
      error: file.error,
    },
    readonly: cfg.readonly,
    items: filtered,
    orphans,
    counts,
  };
}
