/**
 * Search, filters and pages for the Decisions and Log tabs (owner request 2026-10-10,
 * wiki/raw/owner/2026-10-10-s01-decisions-log-browse.md and its approval). Pure functions only: the
 * client component (components/portal/browse/Browse.tsx) keeps the state in the page address, and these
 * functions turn the address into a state, the state back into an address, and pick the items to show.
 *
 * Rules the owner approved:
 * - the search box is case-insensitive and every typed word must appear somewhere in the item's text;
 * - filters: category, tags (an item must have every chosen tag), phase, date from/to (both included),
 *   plus the tab's own ones (Decisions: status, who decided; Log: has decisions / has approvals);
 * - 20 items per page, numbered pages; changing the search or a filter goes back to page 1;
 * - anything in the address that is not a known value is ignored, never an error.
 * No file access: safe to import from client code.
 */

export const PAGE_SIZE = 20;

/** One item as the filters see it. `text` is already normalised (searchText). */
export interface BrowseItem {
  id: string;
  text: string;
  category: string | null;
  tags: string[];
  phase: string | null;
  /** YYYY-MM-DD */
  date: string;
  /** Values for the tab's own filters, by filter key ("status" -> ["Accepted"]). */
  facets: Record<string, string[]>;
}

export interface FilterOption {
  value: string;
  label: string;
}

/** A tab's own single-choice filter (Decisions: status, who decided; Log: has decisions or approvals). */
export interface ExtraFilter {
  key: string;
  label: string;
  /** What the "no choice" option says ("Any status"). */
  anyLabel: string;
  options: FilterOption[];
}

/** What a tab offers. Address values outside these lists are ignored. */
export interface BrowseSpec {
  categories: string[];
  tags: string[];
  phases: string[];
  extras: ExtraFilter[];
}

export interface BrowseState {
  q: string;
  category: string | null;
  tags: string[];
  phase: string | null;
  from: string | null;
  to: string | null;
  /** Chosen value per extra filter key; a key that is absent means "any". */
  extra: Record<string, string>;
  /** 1-based. */
  page: number;
}

export const EMPTY_STATE: BrowseState = { q: "", category: null, tags: [], phase: null, from: null, to: null, extra: {}, page: 1 };

/** Keys the browse state uses in the page address. */
export const PARAM = { q: "q", category: "category", tag: "tag", phase: "phase", from: "from", to: "to", page: "page" } as const;

const MAX_QUERY = 200;

/** True for a real calendar date written YYYY-MM-DD. */
export function isIsoDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}

/**
 * Text as the search compares it: `[words](ref:id)` links become their words, lower case, accents
 * dropped, runs of spaces made one.
 */
export function normalize(text: string): string {
  return text
    .replace(/\[([^\]\n]+)\]\(ref:[^)\s]+\)/g, "$1")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** The searchable text of an item from its parts (null parts are skipped). */
export function searchText(...parts: (string | null | undefined)[]): string {
  return normalize(parts.filter((p): p is string => typeof p === "string" && p.length > 0).join(" \n "));
}

/** The words of a search, normalised; empty for a blank search. */
export function searchWords(q: string): string[] {
  const n = normalize(q);
  return n ? [...new Set(n.split(" "))] : [];
}

/** True when the state narrows the list in any way (the page number does not count). */
export function isFiltered(s: BrowseState): boolean {
  return (
    searchWords(s.q).length > 0 ||
    s.category !== null ||
    s.tags.length > 0 ||
    s.phase !== null ||
    s.from !== null ||
    s.to !== null ||
    Object.keys(s.extra).length > 0
  );
}

/** How many filters are on (the search counts as one), for the "Filters (2 on)" button on phones. */
export function activeCount(s: BrowseState): number {
  return (
    (searchWords(s.q).length > 0 ? 1 : 0) +
    (s.category !== null ? 1 : 0) +
    s.tags.length +
    (s.phase !== null ? 1 : 0) +
    (s.from !== null ? 1 : 0) +
    (s.to !== null ? 1 : 0) +
    Object.keys(s.extra).length
  );
}

/** Reads a state from the page address. Unknown keys and values outside the spec are ignored. */
export function parseState(params: URLSearchParams | string, spec: BrowseSpec): BrowseState {
  const p = typeof params === "string" ? new URLSearchParams(params) : params;
  const one = (k: string): string | null => {
    const v = p.get(k);
    return v === null ? null : v.trim();
  };
  const q = (p.get(PARAM.q) ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY);
  const cat = one(PARAM.category);
  const phase = one(PARAM.phase);
  const tags: string[] = [];
  for (const t of p.getAll(PARAM.tag)) {
    const v = t.trim();
    if (spec.tags.includes(v) && !tags.includes(v)) tags.push(v);
  }
  // Keep the tags in the spec's order, so the same choice always gives the same address.
  tags.sort((a, b) => spec.tags.indexOf(a) - spec.tags.indexOf(b));
  const date = (k: string) => {
    const v = one(k);
    return v !== null && isIsoDate(v) ? v : null;
  };
  const extra: Record<string, string> = {};
  for (const f of spec.extras) {
    const v = one(f.key);
    if (v !== null && f.options.some((o) => o.value === v)) extra[f.key] = v;
  }
  const pageRaw = one(PARAM.page);
  const page = pageRaw !== null && /^[1-9][0-9]{0,5}$/.test(pageRaw) ? Number(pageRaw) : 1;
  return {
    q,
    category: cat !== null && spec.categories.includes(cat) ? cat : null,
    tags,
    phase: phase !== null && spec.phases.includes(phase) ? phase : null,
    from: date(PARAM.from),
    to: date(PARAM.to),
    extra,
    page,
  };
}

/**
 * The page address for a state ("?q=tab+sleep&tag=memory&page=2"), or "" when nothing is chosen.
 * Empty values and page 1 are left out; extras come in the spec's order.
 */
export function stateToQuery(s: BrowseState, spec: BrowseSpec): string {
  const p = new URLSearchParams();
  const q = s.q.replace(/\s+/g, " ").trim();
  if (q) p.set(PARAM.q, q);
  if (s.category) p.set(PARAM.category, s.category);
  for (const t of s.tags) p.append(PARAM.tag, t);
  if (s.phase) p.set(PARAM.phase, s.phase);
  if (s.from) p.set(PARAM.from, s.from);
  if (s.to) p.set(PARAM.to, s.to);
  for (const f of spec.extras) if (s.extra[f.key] !== undefined) p.set(f.key, s.extra[f.key]);
  if (s.page > 1) p.set(PARAM.page, String(s.page));
  const out = p.toString();
  return out ? `?${out}` : "";
}

/** A changed state. Any change other than the page itself goes back to page 1. */
export function update(s: BrowseState, patch: Partial<BrowseState>): BrowseState {
  const next = { ...s, ...patch };
  if (patch.page === undefined) next.page = 1;
  return next;
}

/** The state with one more tag chosen (no change when it is already chosen). Back to page 1. */
export function withTag(s: BrowseState, tag: string, spec: BrowseSpec): BrowseState {
  if (s.tags.includes(tag) || !spec.tags.includes(tag)) return s;
  const tags = [...s.tags, tag].sort((a, b) => spec.tags.indexOf(a) - spec.tags.indexOf(b));
  return update(s, { tags });
}

/** The state without one tag. Back to page 1. */
export function withoutTag(s: BrowseState, tag: string): BrowseState {
  return update(s, { tags: s.tags.filter((t) => t !== tag) });
}

/** Does one item pass the search and every filter? */
export function matches(item: BrowseItem, s: BrowseState, words: string[] = searchWords(s.q)): boolean {
  if (s.category !== null && item.category !== s.category) return false;
  if (s.phase !== null && item.phase !== s.phase) return false;
  for (const t of s.tags) if (!item.tags.includes(t)) return false;
  if (s.from !== null && item.date < s.from) return false;
  if (s.to !== null && item.date > s.to) return false;
  for (const [k, v] of Object.entries(s.extra)) if (!(item.facets[k] ?? []).includes(v)) return false;
  for (const w of words) if (!item.text.includes(w)) return false;
  return true;
}

/** The items that pass, in their original order. */
export function filterItems<T extends BrowseItem>(items: readonly T[], s: BrowseState): T[] {
  const words = searchWords(s.q);
  return items.filter((i) => matches(i, s, words));
}

export interface PageInfo {
  /** The page shown (the asked one, kept inside 1..pages). */
  page: number;
  pages: number;
  /** 1-based number of the first and last item shown; both 0 when nothing matches. */
  start: number;
  end: number;
  total: number;
}

/** Which slice of `total` items page `page` shows. A page past the end shows the last page. */
export function pageInfo(total: number, page: number, size = PAGE_SIZE): PageInfo {
  const pages = Math.max(1, Math.ceil(total / size));
  const p = Math.min(Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1), pages);
  if (total === 0) return { page: 1, pages: 1, start: 0, end: 0, total: 0 };
  const start = (p - 1) * size + 1;
  return { page: p, pages, start, end: Math.min(total, p * size), total };
}

/** The items of one page. */
export function pageSlice<T>(items: readonly T[], info: PageInfo, size = PAGE_SIZE): T[] {
  if (info.total === 0) return [];
  return items.slice((info.page - 1) * size, (info.page - 1) * size + size);
}

/**
 * The page buttons to draw: every page when there are at most 7, else the first, the last, the current
 * one and its neighbours, with `null` for a gap ("1 … 4 5 6 … 12").
 */
export function pageNumbers(page: number, pages: number): (number | null)[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const want = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  if (page <= 3) [2, 3, 4].forEach((n) => want.add(n));
  if (page >= pages - 2) [pages - 3, pages - 2, pages - 1].forEach((n) => want.add(n));
  const sorted = [...want].sort((a, b) => a - b);
  const out: (number | null)[] = [];
  for (const n of sorted) {
    const last = out[out.length - 1];
    if (typeof last === "number" && n - last > 1) out.push(n - last === 2 ? last + 1 : null);
    out.push(n);
  }
  return out;
}

/**
 * The results line: "Showing 21–28 of 28"; with a filter on, "Showing 1–5 of 5 (28 in all)";
 * nothing found: "No matches (28 in all)".
 */
export function resultsLine(info: PageInfo, all: number, filtered: boolean): string {
  const tail = filtered ? ` (${all} in all)` : "";
  if (info.total === 0) return `No matches${tail}`;
  return `Showing ${info.start}–${info.end} of ${info.total}${tail}`;
}
