/**
 * Reference handling for the portal (adr-0024, owner feedback 2026-10-09: "If you have to state IP-62
 * something, I should be able to click it there and then and pop up opens and shows me what it is").
 *
 * - `tokenize` splits a portal text into plain text and references. A reference is either a link
 *   `[words](ref:id)` or a bare id-shaped word matched by the id patterns of plan/portal/pipeline.json,
 *   exactly the words tools/portal-sync-check.ps1 requires an explainer for (UNKNOWN-REF otherwise).
 * - `buildRefData` turns refs.json into the small, serialisable lookup the reference popup uses
 *   (id or alias -> explainer).
 * Pure: no file access, so the client popup and the unit tests use the same code.
 */
import type { Refs } from "./schemas.gen";

export type TextToken = { type: "text"; text: string } | { type: "ref"; id: string; label: string; linked: boolean };

/** `[words](ref:id)`: the id part uses the same character class as the checker (`[^)\s]+`). */
const LINK_RX = /\[([^\]\n]+)\]\(ref:([^)\s]+)\)/g;

/** Compiles the pipeline.json id patterns (.NET syntax; the patterns in use are also valid JS). */
export function compilePatterns(patterns: readonly { regex: string }[]): RegExp[] {
  return patterns.map((p) => new RegExp(p.regex, "g"));
}

interface Span {
  start: number;
  end: number;
  id: string;
}

/** Bare id-shaped words in a text without links: leftmost first, the longest match wins an overlap. */
function bareSpans(text: string, patterns: readonly RegExp[]): Span[] {
  const all: Span[] = [];
  for (const rx of patterns) {
    const g = new RegExp(rx.source, rx.flags.includes("g") ? rx.flags : rx.flags + "g");
    for (const m of text.matchAll(g)) {
      if (m[0] === "") continue;
      all.push({ start: m.index, end: m.index + m[0].length, id: m[0] });
    }
  }
  all.sort((a, b) => a.start - b.start || b.end - a.end);
  const out: Span[] = [];
  let pos = 0;
  for (const s of all) {
    if (s.start < pos) continue;
    out.push(s);
    pos = s.end;
  }
  return out;
}

function pushText(out: TextToken[], text: string): void {
  if (text === "") return;
  const last = out[out.length - 1];
  if (last && last.type === "text") last.text += text;
  else out.push({ type: "text", text });
}

/** Splits one portal text into text and reference tokens (in order, nothing lost or added). */
export function tokenize(text: string, patterns: readonly RegExp[]): TextToken[] {
  const out: TextToken[] = [];
  const plain = (segment: string) => {
    let pos = 0;
    for (const s of bareSpans(segment, patterns)) {
      pushText(out, segment.slice(pos, s.start));
      out.push({ type: "ref", id: s.id, label: s.id, linked: false });
      pos = s.end;
    }
    pushText(out, segment.slice(pos));
  };
  let pos = 0;
  for (const m of text.matchAll(LINK_RX)) {
    plain(text.slice(pos, m.index));
    out.push({ type: "ref", id: m[2], label: m[1], linked: true });
    pos = m.index + m[0].length;
  }
  plain(text.slice(pos));
  return out;
}

/** What the reference popup shows for one id. */
export interface RefInfo {
  id: string;
  kind: Refs["refs"][number]["kind"];
  title: string;
  summary: string;
  status: string | null;
  related: string[];
}

/** Serialisable lookup handed to the client: explainers by id, plus alias -> id (e.g. P1 -> phase-p1-foundation). */
export interface RefData {
  entries: Record<string, RefInfo>;
  aliases: Record<string, string>;
}

export function buildRefData(refs: Refs | null): RefData {
  const entries: Record<string, RefInfo> = {};
  const aliases: Record<string, string> = {};
  for (const r of refs?.refs ?? []) {
    entries[r.id] = { id: r.id, kind: r.kind, title: r.title, summary: r.summary, status: r.status, related: [...r.related] };
    for (const a of r.aliases ?? []) aliases[a] = r.id;
  }
  return { entries, aliases };
}

/** The explainer for an id or alias, or null when refs.json has none. */
export function resolveRef(data: RefData, id: string): RefInfo | null {
  if (Object.hasOwn(data.entries, id)) return data.entries[id];
  const target = Object.hasOwn(data.aliases, id) ? data.aliases[id] : undefined;
  return target !== undefined && Object.hasOwn(data.entries, target) ? data.entries[target] : null;
}

/** Plain words for each kind of reference (shown above the popup title). */
export const KIND_LABEL: Record<RefInfo["kind"], string> = {
  phase: "Phase",
  task: "Task",
  decision: "Decision",
  risk: "Risk",
  "research-question": "Research question",
  hypothesis: "Hypothesis",
  experiment: "Experiment",
  metric: "Measurement",
  workload: "Test workload",
  configuration: "Test setup",
  component: "Part of the system",
  question: "Question for you",
  commit: "Saved change (commit)",
  page: "Plan note",
  step: "Build step",
  term: "Term",
  group: "Group of parts",
  layer: "Layer",
};

/**
 * The short name the owner already knows for an id, or null when the id has none and only its title
 * should show (owner feedback 2026-10-09: no unexplained internal ids). "adr-0019" -> "Decision 19",
 * "risk-r04" -> "Risk 4", "rq-01" -> "Research question 1", "hyp-03" -> "Hypothesis 3", a phase id ->
 * "P1", a task -> "Task p1.3". Questions (Q-221) and commits keep their id: the Questions and Log tabs
 * show it. Parts, layers, measurements, workloads and plan notes have no short name.
 */
export function friendlyId(id: string, kind?: RefInfo["kind"]): string | null {
  let m: RegExpExecArray | null;
  if ((m = /^adr-0*(\d+)$/.exec(id))) return `Decision ${m[1]}`;
  if ((m = /^risk-r0*(\d+)$/.exec(id))) return `Risk ${m[1]}`;
  if ((m = /^rq-0*(\d+)$/.exec(id))) return `Research question ${m[1]}`;
  if ((m = /^hyp-0*(\d+)$/.exec(id))) return `Hypothesis ${m[1]}`;
  if ((m = /^phase-p([0-8])(?:-[a-z0-9]+)+$/.exec(id))) return `P${m[1]}`;
  if (/^P[0-8]$/.test(id)) return id;
  if (/^p[0-8]\.\d+$/.test(id)) return `Task ${id}`;
  if (/^Q-\d{3}$/.test(id)) return id;
  if (kind === "commit") return id;
  return null;
}

/**
 * The small line above a reference popup's title: the kind in words, or the short name when it already
 * says the kind ("Decision 19", "Task p1.3"), plus the short name when it adds something the title
 * does not show ("Question for you · Q-221"). Never the internal slug.
 */
export function popupKind(info: Pick<RefInfo, "id" | "kind" | "title">): { head: string; extra: string | null } {
  const kind = KIND_LABEL[info.kind];
  const short = friendlyId(info.id, info.kind);
  if (!short) return { head: kind, extra: null };
  if (short.startsWith(kind)) return { head: short, extra: null };
  return { head: kind, extra: info.title.startsWith(short) ? null : short };
}
