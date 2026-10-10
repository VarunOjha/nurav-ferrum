/**
 * Small pure helpers the portal pages share (formatting and plain-word labels). No file access.
 */
import type { ApprovalsRead } from "../approvals/file";
import type { Architecture, Decisions, Log, Phase, Questions, Risks, Roadmap } from "./schemas.gen";

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

/** "P0 → P5" for a stage, from the short names of its first and last phase ("P8" for one phase). */
export function stageRange(roadmap: Roadmap, stage: Roadmap["stages"][number]): string {
  const shorts = stage.phases.map((id) => roadmapRow(roadmap, id)?.short ?? id);
  if (shorts.length === 0) return "";
  if (shorts.length === 1) return shorts[0];
  return `${shorts[0]} → ${shorts[shorts.length - 1]}`;
}

/** "16 / 18", or "0 / —" while the phase has no task list yet. */
export function tasksLabel(done: number, total: number | null): string {
  return `${done} / ${total === null ? "—" : total}`;
}

/** Every log entry, newest first (same order rule as latestLog). */
export function newestFirst(log: Log | null): Log["entries"] {
  return latestLog(log, Number.POSITIVE_INFINITY);
}

export type QuestionStatus = Questions["items"][number]["status"];

/** Question groups in the order the Questions tab shows them: open first. File order is kept inside a group. */
export const QUESTION_GROUPS: readonly { status: QuestionStatus; label: string }[] = [
  { status: "open", label: "Open" },
  { status: "answered", label: "Answered" },
  { status: "withdrawn", label: "Withdrawn" },
];

export function questionsByStatus(q: Questions | null): { status: QuestionStatus; label: string; items: Questions["items"] }[] {
  return QUESTION_GROUPS.map((g) => ({ ...g, items: (q?.items ?? []).filter((i) => i.status === g.status) }));
}

/** "You" or "Claude" for a `who` value. */
export function whoLabel(who: "you" | "claude"): string {
  return who === "you" ? "You" : "Claude";
}

/** Colour family of a decision status chip; replaced and rejected decisions are shown muted. */
export function decisionTone(status: Decisions["items"][number]["status"]): Tone {
  switch (status) {
    case "Accepted":
      return "done";
    case "Proposed":
      return "now";
    default:
      return "later";
  }
}

/** Colour family of a risk status chip. */
export function riskTone(status: Risks["items"][number]["status"]): Tone {
  switch (status) {
    case "Resolved":
    case "Accepted":
      return "done";
    case "Being reduced":
      return "now";
    case "Happened":
      return "blocked";
    default:
      return "later";
  }
}

/** Likelihood × impact (1-25), the order the Risks list uses (highest first, then file order). */
export function riskScore(r: Pick<Risks["items"][number], "likelihood" | "impact">): number {
  return r.likelihood * r.impact;
}

export function risksByScore(risks: Risks | null): Risks["items"] {
  return [...(risks?.items ?? [])].map((r, i) => ({ r, i })).sort((a, b) => riskScore(b.r) - riskScore(a.r) || a.i - b.i).map((x) => x.r);
}

/** The first sentence of a text (the whole text when it has one sentence). */
export function firstSentence(text: string): string {
  return headline(text).head;
}

export type Layer = Architecture["layers"][number];

/** One row of the layered diagram: a label and the layers drawn side by side in it. */
export interface LayerRow {
  label: string;
  layers: Layer[];
}

/**
 * Rows of the layered diagram, top to bottom. Neighbouring layers whose names share the part before
 * ": " ("What you see: browser controls", "What you see: websites in tabs") share one row, as in the
 * Architecture mockup; a row label carries the language when every layer in it names the same one.
 */
export function layerRows(layers: readonly Layer[]): LayerRow[] {
  const rows: { prefix: string | null; layers: Layer[] }[] = [];
  for (const l of layers) {
    const i = l.name.indexOf(": ");
    const prefix = i > 0 ? l.name.slice(0, i) : null;
    const last = rows[rows.length - 1];
    if (prefix !== null && last && last.prefix === prefix) last.layers.push(l);
    else rows.push({ prefix, layers: [l] });
  }
  return rows.map((r) => {
    const base = r.prefix ?? r.layers[0].name;
    const langs = [...new Set(r.layers.map((l) => l.language ?? ""))];
    const lang = langs.length === 1 && langs[0] !== "" && r.prefix === null ? ` (${langs[0]})` : "";
    return { label: base + lang, layers: r.layers };
  });
}

/** The part of a layer name after "What you see: ", or the whole name. */
export function layerShortName(l: Layer): string {
  const i = l.name.indexOf(": ");
  return i > 0 ? l.name.slice(i + 2) : l.name;
}
