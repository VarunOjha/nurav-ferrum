/**
 * Small pure helpers the portal pages share (formatting and plain-word labels). No file access.
 */
import type { ApprovalsRead } from "../approvals/file";
import type { Log, Phase, Roadmap } from "./schemas.gen";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-09" -> "9 Oct" (the mockups' date style); anything else is returned unchanged. */
export function shortDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${Number(m[3])} ${month}` : iso;
}

export type Tone = "done" | "now" | "later" | "blocked";

/** Colour family of a phase status chip and progress bar. */
export function phaseTone(status: Phase["status"]): Tone {
  switch (status) {
    case "Done":
      return "done";
    case "In progress":
    case "Waiting for your review":
      return "now";
    case "Blocked":
      return "blocked";
    default:
      return "later";
  }
}

/** Whole-number percentage of tasks done (0 when the total is unknown or zero). */
export function percentDone(done: number, total: number | null): number {
  if (!total || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
}

/**
 * Splits a summary into a headline (its first sentence) and the rest, so the Overview can lead with
 * one short sentence as in the Main mockup. A summary with one sentence has an empty rest.
 */
export function headline(summary: string): { head: string; rest: string } {
  const m = /^(.+?[.!?])\s+(?=[A-Z])/.exec(summary);
  if (!m) return { head: summary, rest: "" };
  return { head: m[1], rest: summary.slice(m[0].length) };
}

/** The newest `n` log entries, newest first (log.json is append-only, oldest first). */
export function latestLog(log: Log | null, n = 3): Log["entries"] {
  if (!log) return [];
  return [...log.entries]
    .map((e, i) => ({ e, i }))
    .sort((a, b) => (a.e.date === b.e.date ? b.i - a.i : a.e.date < b.e.date ? 1 : -1))
    .slice(0, n)
    .map((x) => x.e);
}

/** Roadmap row for a phase id (tasks done/total live there). */
export function roadmapRow(roadmap: Roadmap | null, id: string): Roadmap["phases"][number] | null {
  return roadmap?.phases.find((p) => p.id === id) ?? null;
}

export type ApprovalLabel =
  | "Not approved yet"
  | "Approved"
  | "Approved, page edited since"
  | "Changes requested"
  | "Rejected"
  | "Approvals file unreadable";

/**
 * Read-only approval label for one key of plan/approvals.json. The portal does not read the wiki, so
 * it compares the stored fingerprint with the one the portal text was written from: equal means
 * approved as shown; different means the page changed after the approval (Claude's approvals check
 * decides whether that change matters, SCHEMA §10.3).
 */
export function approvalLabel(read: ApprovalsRead, key: string, currentHash: string | null): ApprovalLabel {
  if (!read.valid || !read.data) return "Approvals file unreadable";
  const rec = Object.hasOwn(read.data.approvals, key) ? read.data.approvals[key] : undefined;
  if (!rec) return "Not approved yet";
  if (rec.status === "rejected") return "Rejected";
  if (rec.status === "changes-requested") return "Changes requested";
  if (rec.status !== "approved") return "Approvals file unreadable";
  if (currentHash !== null && rec.content_hash !== currentHash) return "Approved, page edited since";
  return "Approved";
}
