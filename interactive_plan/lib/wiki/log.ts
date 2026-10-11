/**
 * wiki/log.md parsing (ip-data-contract §5.2, SCHEMA §12). Lenient for bullets, strict for headings.
 */
import { blankFencedCode } from "./links";
import { finding, type LintFinding } from "./findings";

export const LOG_OPS = [
  "ingest",
  "query",
  "lint",
  "decide",
  "handoff",
  "resume",
  "gate",
  "code",
  "approval",
  "schema",
  "correct",
  "plan",
] as const;
export type LogOp = (typeof LOG_OPS)[number];

/** SCHEMA §12 heading regex, verbatim. */
export const LOG_HEADING =
  /^## \[(\d{4}-\d{2}-\d{2})\] (ingest|query|lint|decide|handoff|resume|gate|code|approval|schema|correct|plan) \| (.+)$/;
/** SCHEMA §12 body bullet keys, in their prescribed order. */
export const LOG_BULLET_KEYS = ["session", "time", "pages", "sources", "result", "stales", "next", "commit"] as const;
/** The optional `- time: HH:MM` bullet (24-hour local clock; owner's plan of 2026-10-10). */
export const LOG_TIME = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

export interface LogEntry {
  date: string;
  op: LogOp;
  title: string;
  session?: string;
  /** Time of day "HH:MM" (24-hour local clock), recorded from 2026-10-10 on; absent on older entries. */
  time?: string;
  pages: string[];
  sources: string[];
  result?: string;
  stales: string[];
  /** Free text after a bracketed `pages`/`sources`/`stales` list, e.g. `(no approvals.json exists …)`. */
  notes?: Partial<Record<"pages" | "sources" | "stales", string>>;
  next?: string;
  commit?: string;
  /** 1-based file line of the heading. */
  line: number;
  /** Heading + body text of the entry. */
  raw: string;
}

/**
 * A §12 list value: `[a, b]`, optionally followed by free text such as `(no approvals.json exists, …)`
 * (IP-9 review: the trailing note used to be split on commas into bogus ids). Only the ids inside the
 * brackets are list items; the rest is returned as the note. A value without brackets is a plain
 * comma list.
 */
export function inlineList(v: string): { items: string[]; note: string | null } {
  const t = v.trim();
  const m = /^\[([^\]]*)\]\s*(.*)$/.exec(t);
  const inner = m ? m[1] : t;
  const note = m && m[2].trim() !== "" ? m[2].trim() : null;
  const items = inner
    .split(",")
    .map((x) => x.trim().replace(/^["']|["']$/g, ""))
    .filter((x) => x !== "");
  return { items, note };
}

/**
 * Splits log.md body into entries. Findings (LOG-FORMAT, SCHEMA §9.3):
 * - a line starting `## [` that fails the heading regex
 * - an entry dated earlier than the entry before it (out of chronological order)
 * - a top-level `- key:` bullet whose key is not one of the §12 keys
 * - a `- time:` bullet whose value is not a 24-hour "HH:MM" time
 */
export function parseLog(
  body: string,
  repoPath = "wiki/log.md",
  bodyStartLine = 1,
): { entries: LogEntry[]; findings: LintFinding[] } {
  const entries: LogEntry[] = [];
  const findings: LintFinding[] = [];
  const original = body.split("\n");
  const lines = blankFencedCode(body).split("\n");
  let cur: LogEntry | null = null;
  let rawLines: string[] = [];
  const flush = () => {
    if (cur) {
      cur.raw = rawLines.join("\n").replace(/\n+$/, "");
      entries.push(cur);
    }
    cur = null;
    rawLines = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fileLine = bodyStartLine + i;
    if (line.startsWith("## ")) {
      flush();
      const m = LOG_HEADING.exec(line);
      if (m) {
        const prev = entries[entries.length - 1];
        if (prev && m[1] < prev.date) {
          findings.push(
            finding("LOG-FORMAT", repoPath, `entry dated ${m[1]} follows an entry dated ${prev.date}`, {
              line: fileLine,
            }),
          );
        }
        cur = { date: m[1], op: m[2] as LogOp, title: m[3], pages: [], sources: [], stales: [], line: fileLine, raw: "" };
        rawLines = [original[i]];
      } else if (line.startsWith("## [")) {
        findings.push(
          finding("LOG-FORMAT", repoPath, `heading does not match the SCHEMA §12 regex: ${line}`, { line: fileLine }),
        );
      }
      continue;
    }
    if (!cur) continue;
    const entry: LogEntry = cur;
    rawLines.push(original[i]);
    const b = /^- ([A-Za-z_][\w-]*):(?:\s+(.*))?$/.exec(line);
    if (!b) continue;
    const key = b[1];
    const val = (b[2] ?? "").trim();
    switch (key) {
      case "session":
        entry.session = val;
        break;
      case "time":
        if (LOG_TIME.test(val)) entry.time = val;
        else
          findings.push(
            finding("LOG-FORMAT", repoPath, `time \`${val}\` is not a 24-hour time written HH:MM (for example 21:41)`, {
              line: fileLine,
            }),
          );
        break;
      case "pages": {
        const l = inlineList(val);
        entry.pages = l.items;
        if (l.note) entry.notes = { ...entry.notes, pages: l.note };
        break;
      }
      case "sources": {
        const l = inlineList(val);
        entry.sources = l.items;
        if (l.note) entry.notes = { ...entry.notes, sources: l.note };
        break;
      }
      case "result":
        entry.result = val;
        break;
      case "stales": {
        const l = inlineList(val);
        entry.stales = l.items;
        if (l.note) entry.notes = { ...entry.notes, stales: l.note };
        break;
      }
      case "next":
        entry.next = val;
        break;
      case "commit":
        entry.commit = val;
        break;
      default:
        findings.push(
          finding("LOG-FORMAT", repoPath, `bullet key \`${key}\` is not one of ${LOG_BULLET_KEYS.join(", ")}`, {
            line: fileLine,
          }),
        );
    }
  }
  flush();
  return { entries, findings };
}
