/**
 * "Diff since approval" data (ip-routes-and-views §3.4, §3.11): reads the approval snapshot named by a
 * record (`plan/snapshots/<dir>/<hex>.md`, ip-approvals-api §2.1 step 8) from the data dir and diffs
 * it against the current page file with the pure lib/approvals/diff.ts. Read-only.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { changes, diffLines, type DiffLine } from "../approvals/diff";
import type { ApprovalItem } from "../approvals/view";
import type { PlanConfig } from "../config";

export interface SnapshotDiff {
  /** Changed lines only (del/add) with their line numbers; null when there is no snapshot to compare. */
  lines: DiffLine[] | null;
  /** Why there is no diff (no snapshot recorded, or the snapshot file is missing). */
  note: string | null;
}

const SNAP = /^plan\/snapshots\/([a-z0-9][a-z0-9.-]*(?:__exit)?)\/([0-9a-f]{64})\.md$/;

/** The diff for a STALE / APPROVED_VOLATILE_DRIFT item; null for any other state. */
export async function snapshotDiff(
  item: Pick<ApprovalItem, "state" | "record" | "path">,
  cfg: Pick<PlanConfig, "dataDir" | "repoRoot" | "wikiDir">,
): Promise<SnapshotDiff | null> {
  if (item.state !== "STALE" && item.state !== "APPROVED_VOLATILE_DRIFT") return null;
  const snap = item.record && typeof item.record.snapshot === "string" ? item.record.snapshot : null;
  const m = snap ? SNAP.exec(snap) : null;
  const gitHint = `git log -p --follow -- ${item.path}`;
  if (!m) return { lines: null, note: `No snapshot was recorded with this approval. If git history exists: ${gitHint}` };
  try {
    const [old, cur] = await Promise.all([
      readFile(path.join(cfg.dataDir, "snapshots", m[1], `${m[2]}.md`)),
      readFile(
        item.path.startsWith("wiki/")
          ? path.join(cfg.wikiDir, ...item.path.slice(5).split("/"))
          : path.join(cfg.repoRoot, ...item.path.split("/")),
      ),
    ]);
    return { lines: changes(diffLines(old, cur)), note: null };
  } catch {
    return { lines: null, note: `The snapshot file ${snap} or the page file could not be read. If git history exists: ${gitHint}` };
  }
}
