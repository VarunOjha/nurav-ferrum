/**
 * Full-text search over the loaded wiki (ip-routes-and-views §3.9). Pure: the index is built from a
 * WikiIndex and rebuilt when any file's (path, mtime, size) changes. Ranking tiers, highest first:
 * exact id > title (or id substring) > alias/tag > heading > body. Matching is case-insensitive.
 */
import type { WikiIndex, WikiPage } from "./load";

export type SearchField = "id" | "title" | "alias" | "tag" | "heading" | "body";

export interface SearchDoc {
  id: string | null;
  path: string;
  kind: WikiPage["kind"];
  title: string;
  type: string | null;
  status: string | null;
  aliases: string[];
  tags: string[];
  headings: string[];
  /** Body text with fenced code kept (diagrams and commands are searchable too), whitespace collapsed. */
  body: string;
  /** Lower-cased copies for matching. */
  lc: { id: string; title: string; aliases: string[]; tags: string[]; headings: string[]; body: string };
}

export interface Snippet {
  before: string;
  match: string;
  after: string;
}

export interface SearchHit {
  doc: SearchDoc;
  /** Tier: 5 id, 4 title, 3 alias/tag, 2 heading, 1 body. */
  tier: number;
  field: SearchField;
  /** Tie-breaker inside a tier (higher first). */
  sub: number;
  snippet: Snippet | null;
}

const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/** Display title of any page: frontmatter title, else the first heading, else the file name. */
export function pageTitle(p: WikiPage): string {
  const fm = (p.fm ?? p.rawFm ?? {}) as Record<string, unknown>;
  return str(fm.title) ?? p.headings[0]?.text ?? p.path.split("/").pop() ?? p.path;
}

export function toDoc(p: WikiPage): SearchDoc {
  const fm = (p.fm ?? p.rawFm ?? {}) as Record<string, unknown>;
  const title = pageTitle(p);
  const aliases = strs(fm.aliases);
  const tags = strs(fm.tags);
  const headings = p.headings.map((h) => h.text);
  const body = p.body.replace(/\s+/g, " ").trim();
  return {
    id: p.id,
    path: p.path,
    kind: p.kind,
    title,
    type: str(fm.type),
    status: str(fm.status),
    aliases,
    tags,
    headings,
    body,
    lc: {
      id: (p.id ?? "").toLowerCase(),
      title: title.toLowerCase(),
      aliases: aliases.map((a) => a.toLowerCase()),
      tags: tags.map((t) => t.toLowerCase()),
      headings: headings.map((h) => h.toLowerCase()),
      body: body.toLowerCase(),
    },
  };
}

let memo: { sig: string; docs: SearchDoc[] } | null = null;

/** Search documents for every markdown page (wiki, raw research, raw markdown, STATUS.md). Memoised on file signatures. */
export function buildSearchIndex(idx: Pick<WikiIndex, "pages">): SearchDoc[] {
  const sig = idx.pages.map((p) => `${p.path}:${p.mtimeMs}:${p.size}`).join("|");
  if (memo && memo.sig === sig) return memo.docs;
  const docs = idx.pages.map(toDoc);
  memo = { sig, docs };
  return docs;
}

/** Drops the memoised index (tests). */
export function clearSearchCache(): void {
  memo = null;
}

const SNIPPET_RADIUS = 80;

export function makeSnippet(text: string, lcText: string, needle: string): Snippet | null {
  const at = lcText.indexOf(needle);
  if (at < 0) return null;
  const start = Math.max(0, at - SNIPPET_RADIUS);
  const end = Math.min(text.length, at + needle.length + SNIPPET_RADIUS);
  return {
    before: (start > 0 ? "…" : "") + text.slice(start, at),
    match: text.slice(at, at + needle.length),
    after: text.slice(at + needle.length, end) + (end < text.length ? "…" : ""),
  };
}

function countOf(hay: string, needle: string): number {
  let n = 0;
  for (let i = hay.indexOf(needle); i >= 0 && n < 1000; i = hay.indexOf(needle, i + needle.length)) n++;
  return n;
}

export function matchDoc(d: SearchDoc, rawQuery: string): SearchHit | null {
  const q = rawQuery.trim().toLowerCase().replace(/\s+/g, " ");
  if (q === "") return null;
  const terms = q.split(" ");
  if (d.lc.id !== "" && d.lc.id === q) return { doc: d, tier: 5, field: "id", sub: 0, snippet: null };
  if (d.lc.title.includes(q) || (d.lc.id !== "" && d.lc.id.includes(q))) {
    const sub = d.lc.title === q ? 3 : d.lc.title.startsWith(q) || d.lc.id.startsWith(q) ? 2 : 1;
    return { doc: d, tier: 4, field: "title", sub, snippet: null };
  }
  if (d.lc.aliases.some((a) => a.includes(q))) {
    return { doc: d, tier: 3, field: "alias", sub: d.lc.aliases.includes(q) ? 1 : 0, snippet: null };
  }
  if (d.lc.tags.some((t) => t.includes(q))) {
    return { doc: d, tier: 3, field: "tag", sub: d.lc.tags.includes(q) ? 1 : 0, snippet: null };
  }
  const hi = d.lc.headings.findIndex((h) => h.includes(q));
  if (hi >= 0) {
    return { doc: d, tier: 2, field: "heading", sub: 0, snippet: { before: "", match: d.headings[hi], after: "" } };
  }
  if (d.lc.body.includes(q)) {
    return { doc: d, tier: 1, field: "body", sub: countOf(d.lc.body, q), snippet: makeSnippet(d.body, d.lc.body, q) };
  }
  // Several words that do not occur as a phrase: every word must occur in the body.
  if (terms.length > 1 && terms.every((t) => d.lc.body.includes(t))) {
    return { doc: d, tier: 1, field: "body", sub: 0, snippet: makeSnippet(d.body, d.lc.body, terms[0]) };
  }
  return null;
}

export interface SearchOptions {
  /** Only documents of this frontmatter type (`raw` selects raw files without a type). */
  type?: string | null;
  limit?: number;
}

const docKey = (d: SearchDoc) => d.id ?? d.path;

export function search(docs: readonly SearchDoc[], q: string, opts: SearchOptions = {}): SearchHit[] {
  const hits: SearchHit[] = [];
  for (const d of docs) {
    if (opts.type) {
      if (opts.type === "raw" ? d.kind !== "raw" : d.type !== opts.type) continue;
    }
    const h = matchDoc(d, q);
    if (h) hits.push(h);
  }
  hits.sort((a, b) => b.tier - a.tier || b.sub - a.sub || (docKey(a.doc) < docKey(b.doc) ? -1 : docKey(a.doc) > docKey(b.doc) ? 1 : 0));
  return opts.limit ? hits.slice(0, opts.limit) : hits;
}

/** Facet counts by type for a result list (raw files without a type count as `raw`). */
export function typeCounts(hits: readonly SearchHit[]): [string, number][] {
  const m = new Map<string, number>();
  for (const h of hits) {
    const t = h.doc.type ?? (h.doc.kind === "raw" ? "raw" : "other");
    m.set(t, (m.get(t) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
}

export interface Suggestion {
  id: string;
  title: string;
}

/** Id/title pairs for the top-bar suggestions (pages with an id only). */
export function suggestionList(idx: Pick<WikiIndex, "pages">): Suggestion[] {
  return idx.pages
    .filter((p) => p.id !== null)
    .map((p) => ({ id: p.id!, title: pageTitle(p) }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Top-bar suggestions: id prefix, then id substring, then title substring. */
export function suggest(list: readonly Suggestion[], q: string, limit = 8): Suggestion[] {
  const n = q.trim().toLowerCase();
  if (n === "") return [];
  const scored: { s: Suggestion; r: number }[] = [];
  for (const s of list) {
    const id = s.id.toLowerCase();
    const t = s.title.toLowerCase();
    const r = id === n ? 0 : id.startsWith(n) ? 1 : id.includes(n) ? 2 : t.includes(n) ? 3 : -1;
    if (r >= 0) scored.push({ s, r });
  }
  scored.sort((a, b) => a.r - b.r || (a.s.id < b.s.id ? -1 : 1));
  return scored.slice(0, limit).map((x) => x.s);
}
