/**
 * Optional `approval` log entry (ip-approvals-api §6; SCHEMA §10.1, §12). Appends only: never
 * rewrites wiki/log.md and never creates it (missing log -> LOG_MISSING warning).
 */
import * as fsp from "node:fs/promises";
import type { ApprovalDecision } from "./model";
import { pageIdOfKey } from "./state";

export interface LogEntryInput {
  key: string;
  status: ApprovalDecision;
  /** Record timestamp (local ISO with offset); its date part is the heading date. */
  timestamp: string;
  contentHash: string;
  comment: string;
}

/** First 200 characters of the comment, newlines (and the whitespace around them) collapsed to one space, `"` escaped. */
export function logComment(comment: string): string {
  const flat = comment.replace(/\s*[\r\n]+\s*/g, " ").trim();
  return Array.from(flat).slice(0, 200).join("").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** The entry block (starts with its `## [` heading, ends with `\n`). */
export function formatApprovalEntry(e: LogEntryInput): string {
  const date = e.timestamp.slice(0, 10);
  return (
    `## [${date}] approval | ${e.key} ${e.status}\n` +
    `- pages: [${pageIdOfKey(e.key)}]\n` +
    `- result: ${e.status} by owner via plan app; content_hash ${e.contentHash}; comment: "${logComment(e.comment)}"\n`
  );
}

/** Separator so the entry is preceded by exactly one blank line, given the file's last two bytes. */
export function separatorFor(tail: Buffer): string {
  if (tail.length === 0) return "";
  const s = tail.toString("latin1").replace(/\r/g, "");
  if (s.endsWith("\n\n")) return "";
  if (s.endsWith("\n")) return "\n";
  return "\n\n";
}

export type LogAppendResult = { appended: true } | { appended: false; warning: "LOG_MISSING" | "LOG_APPEND_FAILED"; message: string };

export async function appendApprovalLog(logFile: string, e: LogEntryInput): Promise<LogAppendResult> {
  let fh: fsp.FileHandle;
  try {
    fh = await fsp.open(logFile, "r+"); // r+ never creates the file
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return { appended: false, warning: "LOG_MISSING", message: `${logFile} does not exist` };
    return { appended: false, warning: "LOG_APPEND_FAILED", message: String(err) };
  }
  try {
    const { size } = await fh.stat();
    const tail = Buffer.alloc(Math.min(4, size));
    if (tail.length > 0) await fh.read(tail, 0, tail.length, size - tail.length);
    const text = separatorFor(tail) + formatApprovalEntry(e);
    await fh.write(text, size, "utf8");
    return { appended: true };
  } catch (err) {
    return { appended: false, warning: "LOG_APPEND_FAILED", message: String(err) };
  } finally {
    await fh.close();
  }
}
