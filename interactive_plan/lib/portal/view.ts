/**
 * Small pure helpers the portal pages share (formatting and plain-word labels). No file access.
 */
import type { ApprovalsRead } from "../approvals/file";
import type { Architecture, Decisions, Log, Phase, Risks, Roadmap } from "./schemas.gen";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-09" -> "9 Oct" (the mockups' date style); anything else is returned unchanged. */
export function shortDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${Number(m[3])} ${month}` : iso;
}

/**
 * A card's date with its time of day when known: "10 Oct" or "10 Oct 21:41" (owner's plan of
 * 2026-10-10: new log entries and questions store a 24-hour local time; older ones keep the date only).
 */
export function dateTime(iso: string, time: string | null | undefined): string {
  return time ? `${shortDate(iso)} ${time}` : shortDate(iso);
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

/**
 * One plain answer to "where does this decision stand?" (review 2026-10-09: "Accepted", "You decided"
 * and "Not approved yet" side by side read as a contradiction). Choosing a decision (in chat) and
 * signing off its written page (an approval in Claude Code) are two steps; this says which are done.
 * `chip` is the short status, `short` the list-row line, `line` the popup sentence.
 */
export function decisionStanding(
  d: Pick<Decisions["items"][number], "status" | "decided_by" | "date">,
  approval: ApprovalLabel,
): { chip: string; short: string; line: string } {
  const when = shortDate(d.date);
  if (d.status === "Replaced") return { chip: "Replaced", short: `Replaced · decided ${when}`, line: `Decided on ${when} and later replaced, so its page needs no sign-off.` };
  if (d.status === "Rejected") return { chip: "Rejected", short: `Rejected · ${when}`, line: `Rejected on ${when}; nothing to sign off.` };
  const chose = d.decided_by === "you" ? `You chose this on ${when}` : `Claude proposed this on ${when}`;
  const chip = d.decided_by === "you" ? "Chosen by you" : d.status === "Proposed" ? "Proposed by Claude" : "Accepted";
  const page: Record<ApprovalLabel, [string, string]> = {
    "Not approved yet": [
      "page not signed off yet",
      d.decided_by === "you" ? "its written page waits for your sign-off in Claude Code." : "it waits for your decision in Claude Code.",
    ],
    Approved: ["page signed off", "you signed off its written page."],
    "Approved, page edited since": ["page changed since your sign-off", "you signed off its page, but the page changed since, so Claude will ask you again."],
    "Changes requested": ["you asked for changes", "you asked for changes to its written page."],
    Rejected: ["you rejected the page", "you rejected its written page."],
    "Approvals file unreadable": ["sign-off unknown", "the approvals file could not be read, so its sign-off is unknown."],
  };
  const [shortPage, linePage] = page[approval];
  const who = d.decided_by === "you" ? "You chose" : "Claude proposed";
  return { chip, short: `${who} · ${when} · ${shortPage}`, line: `${chose}; ${linePage}` };
}

/** The Overview's "Questions for you" row, counted from the list itself so the numbers cannot drift. */
export function questionsRow(q: { open: number; items: readonly unknown[] }): string {
  const asked = q.items.length;
  if (q.open === 0) return "None open";
  if (asked === 0) return `${q.open} open; none asked right now`;
  return `${q.open} open; ${asked} of them ${asked === 1 ? "is" : "are"} asked now`;
}

/**
 * When a part arrives: "Built in P2 · First working app" for our own parts, "Used from P1 · Foundation"
 * for parts someone else provides (Windows, WebView2, Chrome, Edge). Review 2026-10-09: "Built in" next
 * to Windows read as if we were building Windows.
 */
export function partWhen(c: { ours: boolean }, phaseName: string): string {
  return `${c.ours ? "Built in" : "Used from"} ${phaseName}`;
}

/** Plain label of a task's status chip and its colour family. */
export function taskTone(status: Phase["tasks"][number]["status"]): Tone | "you" {
  switch (status) {
    case "Done":
      return "done";
    case "In progress":
      return "now";
    case "Waiting for you":
      return "you";
    default:
      return "later";
  }
}

/**
 * The columns of the phase popup's tasks table, in order (owner request 2026-10-10,
 * wiki/raw/owner/2026-10-10-s01-task-table-columns.md). On a phone each name labels its row of the task card.
 */
export const TASK_COLUMNS = ["Id", "Title", "What", "Why", "How", "Logic", "Check script", "State"] as const;
export type TaskColumn = (typeof TASK_COLUMNS)[number];

/**
 * The steps of a thought chain ("cause → action → why it matters"), one per line in the Logic column.
 * A step keeps its own text; the arrows are dropped (the view draws them). A "[words](ref:id)" link
 * that contains an arrow is never cut: if splitting would break one, the whole chain stays one step.
 */
export function chainSteps(chain: string): string[] {
  const steps = chain
    .split("→")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const balanced = (s: string) => (s.match(/\[/g)?.length ?? 0) === (s.match(/\]/g)?.length ?? 0) && (s.match(/\(/g)?.length ?? 0) === (s.match(/\)/g)?.length ?? 0);
  if (steps.length < 2 || !steps.every(balanced)) return [chain.trim()];
  return steps;
}

/**
 * The word a screen reader hears before step i (1-based after the first) of a thought chain, in place of
 * the arrow the view draws but hides from screen readers (review 2026-10-10): cause, "then" action,
 * "so" why it matters. A task chain has exactly three steps (plan/portal/schema/phase.schema.json).
 */
export function chainJoin(i: number): string {
  return i <= 1 ? "then" : "so";
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

/** Likelihood × impact (1-25): "Risk 4 × 5 = 20" and the Risks list's "Highest risk first" (lib/portal/browseTabs.ts). */
export function riskScore(r: Pick<Risks["items"][number], "likelihood" | "impact">): number {
  return r.likelihood * r.impact;
}

/**
 * Text for a place that cannot hold a reference button (the text inside a layer box, which is itself a button):
 * every `[words](ref:id)` link becomes its words, so no link markup shows.
 */
export function plainText(text: string): string {
  return text.replace(/\[([^\]\n]+)\]\(ref:[^)\s]+\)/g, "$1");
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
