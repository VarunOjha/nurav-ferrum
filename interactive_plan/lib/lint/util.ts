/** Small helpers shared by the lint rules. Pure. */
import type { WikiIndex, WikiPage } from "../wiki/load";
import type { PhasePage } from "../wiki/schemas";
import { SINGLETON_IDS } from "../wiki/schemas";

/** Validated frontmatter when available, else the raw parsed YAML (so broken pages still get reference checks). */
export function fmObj(p: WikiPage): Record<string, unknown> {
  const v = p.fm ?? p.rawFm;
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

/** Pages in the lint's sense: files with frontmatter and an id (wiki pages, raw research notes, STATUS.md). */
export function isPage(p: WikiPage): p is WikiPage & { id: string } {
  return p.id !== null && p.kind !== "raw";
}

export const isSingleton = (id: string): boolean => (SINGLETON_IDS as readonly string[]).includes(id);

export function strField(p: WikiPage, key: string): string | null {
  const v = fmObj(p)[key];
  return typeof v === "string" ? v : null;
}

/** Valid phase pages (zod-parsed), in path order. */
export function phasePages(idx: Pick<WikiIndex, "pages">): (WikiPage & { fm: PhasePage })[] {
  return idx.pages.filter((p): p is WikiPage & { fm: PhasePage } => p.fm?.type === "phase");
}

/** Every task id defined on a valid phase page. */
export function taskIds(idx: Pick<WikiIndex, "pages">): Set<string> {
  const out = new Set<string>();
  for (const p of phasePages(idx)) for (const t of p.fm.tasks) out.add(t.id);
  return out;
}

/** Splits a body into paragraphs (blocks separated by blank lines) with their 1-based file start line. */
export function paragraphs(body: string, bodyStartLine: number): { text: string; line: number }[] {
  const out: { text: string; line: number }[] = [];
  const lines = body.split("\n");
  let buf: string[] = [];
  let start = 0;
  const flush = () => {
    if (buf.length > 0) out.push({ text: buf.join("\n"), line: bodyStartLine + start });
    buf = [];
  };
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "") {
      flush();
      continue;
    }
    if (buf.length === 0) start = i;
    buf.push(lines[i]);
  }
  flush();
  return out;
}

/** Local calendar date YYYY-MM-DD. */
export function localDate(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
