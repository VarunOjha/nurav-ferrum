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
export const LOG_BULLET_KEYS = ["session", "pages", "sources", "result", "stales", "next", "commit"] as const;

export interface LogEntry {
  date: string;
  op: LogOp;
  title: string;
  session?: string;
  pages: string[];
  sources: string[];
  result?: string;
  stales: string[];
  next?: string;
  commit?: string;
  /** 1-based file line of the heading. */
  line: number;
  /** Heading + body text of the entry. */
  raw: string;
}

function inlineList(v: string): string[] {
  const t = v.trim();
  const inner = t.startsWith("[") && t.endsWith("]") ? t.slice(1, -1) : t;
  return inner
    .split(",")
    .map((x) => x.trim().replace(/^["']|["']$/g, ""))
    .filter((x) => x !== "");
}

/**
 * Splits log.md body into entries. Findings (LOG-FORMAT, SCHEMA §9.3):
 * - a line starting `## [` that fails the heading regex
 * - an entry dated earlier than the entry before it (out of chronological order)
 * - a top-level `- key:` bullet whose key is not one of the §12 keys
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
      case "pages":
        entry.pages = inlineList(val);
        break;
      case "sources":
        entry.sources = inlineList(val);
        break;
      case "result":
        entry.result = val;
        break;
      case "stales":
        entry.stales = inlineList(val);
        break;
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
