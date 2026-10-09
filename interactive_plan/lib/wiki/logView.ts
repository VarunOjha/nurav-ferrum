/**
 * Log timeline view model (ip-routes-and-views §3.10): filters by op, session and page id, newest
 * first by default (chronological on request), grouped by date, and the RESUME "last 5" view
 * (SCHEMA §9.6: `grep "^## \[" wiki/log.md | tail -5`). Pure.
 */
import type { LogEntry } from "./log";

export interface LogFilter {
  op?: string | null;
  session?: string | null;
  /** Page id in `pages` or `stales`. */
  page?: string | null;
  order?: "newest" | "oldest";
  /** Only the last 5 entries in file order (RESUME recipe). */
  last5?: boolean;
}

export interface LogDay {
  date: string;
  entries: LogEntry[];
}

export function filterLog(entries: readonly LogEntry[], f: LogFilter = {}): LogEntry[] {
  let out = f.last5 ? entries.slice(-5) : [...entries];
  if (f.op) out = out.filter((e) => e.op === f.op);
  if (f.session) out = out.filter((e) => e.session === f.session);
  if (f.page) out = out.filter((e) => e.pages.includes(f.page!) || e.stales.includes(f.page!));
  // File order is chronological (LOG-FORMAT enforces it); newest first reverses it.
  if ((f.order ?? "newest") === "newest") out.reverse();
  return out;
}

export function groupByDate(entries: readonly LogEntry[]): LogDay[] {
  const days: LogDay[] = [];
  for (const e of entries) {
    const last = days[days.length - 1];
    if (last && last.date === e.date) last.entries.push(e);
    else days.push({ date: e.date, entries: [e] });
  }
  return days;
}

/** Distinct sessions in file order. */
export function sessionsOf(entries: readonly LogEntry[]): string[] {
  const s: string[] = [];
  for (const e of entries) if (e.session && !s.includes(e.session)) s.push(e.session);
  return s;
}
