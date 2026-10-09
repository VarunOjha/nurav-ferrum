/**
 * plan/approvals.json reading and serialisation (ip-data-contract §8.1). No writes here: the only
 * writer is lib/approvals/store.ts.
 */
import * as fsp from "node:fs/promises";
import { ApprovalsFile, emptyApprovals } from "./model";

// ------------------------------------------------------------------------------------------
// Reading and serialising approvals.json
// ------------------------------------------------------------------------------------------

/** Raw JSON object as stored (kept verbatim so unknown fields and history survive byte for byte). */
export type RawApprovals = { schema_version: 1; approvals: Record<string, Record<string, unknown>> };

export interface ApprovalsRead {
  exists: boolean;
  valid: boolean;
  error: string | null;
  /** Parsed raw data; the empty file model when missing; null when invalid. */
  data: RawApprovals | null;
}

export async function readApprovals(file: string, fs: { readFile: typeof fsp.readFile } = fsp): Promise<ApprovalsRead> {
  let text: string;
  try {
    text = await fs.readFile(file, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      return { exists: false, valid: true, error: null, data: emptyApprovals() as RawApprovals };
    }
    return { exists: true, valid: false, error: `cannot read: ${String(e)}`, data: null };
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (e) {
    return { exists: true, valid: false, error: `invalid JSON: ${(e as Error).message}`, data: null };
  }
  const r = ApprovalsFile.safeParse(json);
  if (!r.success) {
    const first = r.error.issues[0];
    return {
      exists: true,
      valid: false,
      error: `schema: ${first ? `${first.path.join(".")}: ${first.message}` : "invalid"}`,
      data: null,
    };
  }
  return { exists: true, valid: true, error: null, data: json as RawApprovals };
}

const RECORD_ORDER = [
  "status",
  "comment",
  "timestamp",
  "path",
  "content_hash",
  "scope_hash",
  "approved_by",
  "history",
  "snapshot",
  "bootstrap_hash",
];
const HISTORY_ORDER = ["status", "comment", "timestamp", "content_hash", "scope_hash"];

function ordered(obj: Record<string, unknown>, order: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of order) if (Object.hasOwn(obj, k)) out[k] = obj[k];
  for (const k of Object.keys(obj)) if (!order.includes(k)) out[k] = obj[k];
  return out;
}

/** ip-data-contract §8.1: keys of `approvals` sorted, record keys in SCHEMA order, 2-space indent, trailing LF. */
export function serializeApprovals(data: RawApprovals): string {
  const approvals: Record<string, unknown> = {};
  for (const key of Object.keys(data.approvals).sort()) {
    const rec = ordered(data.approvals[key], RECORD_ORDER);
    if (Array.isArray(rec.history)) {
      rec.history = rec.history.map((h) =>
        h && typeof h === "object" && !Array.isArray(h) ? ordered(h as Record<string, unknown>, HISTORY_ORDER) : h,
      );
    }
    approvals[key] = rec;
  }
  return JSON.stringify({ ...data, schema_version: data.schema_version, approvals }, null, 2) + "\n";
}
