/**
 * plan/approvals.json reading (ip-data-contract §8.1). Read-only: the portal and the wiki check only
 * read it; Claude records approvals with tools/approvals_record.py (adr-0023).
 */
import * as fsp from "node:fs/promises";
import { ApprovalsFile, emptyApprovals } from "./model";

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
