/**
 * Server-side props for the client ApproveBar (ip-routes-and-views §3.4): the item from the approvals
 * view, the stored record reduced to what the bar shows, the snapshot diff for STALE/drift items and,
 * for key `schema`, the CLAUDE.md hash the owner sees (ip-data-contract §6.2).
 */
import type { ApproveBarProps, ApproveBarRecord } from "@/components/ApproveBar";
import type { ApprovalItem } from "../approvals/view";
import type { PlanConfig } from "../config";
import { snapshotDiff } from "./snapshot";

const s = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

export function barRecord(rec: Record<string, unknown> | null): ApproveBarRecord | null {
  if (!rec) return null;
  const history = Array.isArray(rec.history)
    ? rec.history.map((h) => {
        const o = (h && typeof h === "object" ? h : {}) as Record<string, unknown>;
        return { status: s(o.status), comment: s(o.comment), timestamp: s(o.timestamp) };
      })
    : [];
  return { status: s(rec.status), comment: s(rec.comment), timestamp: s(rec.timestamp), history };
}

export async function approveBarProps(
  item: ApprovalItem,
  label: string,
  cfg: Pick<PlanConfig, "readonly" | "dataDir" | "repoRoot" | "wikiDir">,
  bootstrapHash: string | null,
): Promise<ApproveBarProps> {
  return {
    itemKey: item.key,
    label,
    state: item.state,
    record: barRecord(item.record),
    contentHash: item.current.content_hash,
    scopeHash: item.current.scope_hash,
    bootstrapHash: item.key === "schema" ? bootstrapHash : undefined,
    readonly: cfg.readonly,
    diff: await snapshotDiff(item, cfg),
  };
}
