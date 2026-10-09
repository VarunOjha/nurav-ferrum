/**
 * plan/approvals.json model (ip-data-contract §8.1; SCHEMA §10.1). Read and written only through
 * lib/approvals/store.ts (IP-4); defined here so the pure state and gate modules (IP-3) share it.
 */
import { z } from "zod";

export const Hash = z.string().regex(/^sha256:[0-9a-f]{64}$/);
export const DECISIONS = ["approved", "changes-requested", "rejected"] as const;
export const Decision = z.enum(DECISIONS);
export const Iso = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:\d{2}|Z)$/);

export const Hist = z.looseObject({
  status: Decision,
  comment: z.string(),
  timestamp: Iso,
  content_hash: Hash,
  scope_hash: Hash,
});

export const Rec = z.looseObject({
  status: Decision,
  comment: z.string(),
  timestamp: Iso,
  path: z.string().regex(/^[^\\]+$/),
  content_hash: Hash,
  scope_hash: Hash,
  approved_by: z.literal("owner"),
  history: z.array(Hist),
  snapshot: z
    .string()
    .regex(/^plan\/snapshots\/[^\\]+\.md$/)
    .optional(),
  /** Key `schema` only: content_hash of root CLAUDE.md (SCHEMA §10.2). */
  bootstrap_hash: Hash.optional(),
});

export const Key = z.string().regex(/^[a-z0-9][a-z0-9.-]*(#exit)?$/);

export const ApprovalsFile = z.object({
  schema_version: z.literal(1),
  approvals: z.record(Key, Rec),
});

export type ApprovalDecision = z.infer<typeof Decision>;
export type ApprovalRecord = z.infer<typeof Rec>;
export type ApprovalHistoryItem = z.infer<typeof Hist>;
export type ApprovalsData = z.infer<typeof ApprovalsFile>;
export type Approvals = ApprovalsData["approvals"];

/** A missing approvals.json reads as this (ip-data-contract §8.1). */
export const emptyApprovals = (): ApprovalsData => ({ schema_version: 1, approvals: {} });
