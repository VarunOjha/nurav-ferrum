/**
 * Search, filters, sort and pages for every list of cards in the portal: Log, Questions, Decisions,
 * Risks and Research (owner requests 2026-10-10: wiki/raw/owner/2026-10-10-s01-decisions-log-browse.md,
 * then wiki/raw/owner/2026-10-10-s01-browse-v2-*.md, "one pattern for every list"). Pure functions
 * only: the client component (components/portal/browse/Browse.tsx) keeps the state in the page
 * address, and these functions turn the address into a state, the state back into an address, and
 * pick and order the items to show.
 *
 * Rules the owner approved:
 * - the search box is case-insensitive and every typed word must appear somewhere in the item's text;
 * - filters: category, tags (an item must have every chosen tag), phase, date from/to (both included,
 *   only on tabs whose dates differ), plus the tab's own ones (Log: has decisions / approvals;
 *   Decisions: status, who decided; Questions, Risks, Research: status);
 * - a tab's own filter may start on a value (Questions: status "Open"); then the address says
 *   "status=any" when you choose "Any", and nothing while the starting value is chosen;
 * - sort: Newest first, Oldest first, By phase, A to Z by title, plus Decisions "By number" and Risks
 *   "Highest risk first"; each tab has its own starting order;
 * - same date (and time): the written order (the order in the file), which "Newest first" reverses;
 *   the item id breaks any tie left;
 * - 20 items per page, numbered pages; changing the search, a filter or the sort goes back to page 1;
 * - anything in the address that is not a known value is ignored, never an error.
 * Which cards are open is not kept in the address (owner's answer). No file access: safe to import
 * from client code.
 */

export const PAGE_SIZE = 20;

/** One item as the filters and the sort see it. `text` is already normalised (searchText). */
export interface BrowseItem {
  id: string;
  text: string;
  /** The plain title, for "A to Z by title" (link markup already removed). */
  title: string;
  category: string | null;
  tags: string[];
  /** The phases the item belongs to (a question may hold up several); empty for none. */
  phases: string[];
  /** YYYY-MM-DD, or null on tabs without dates (Risks, Research). */
  date: string | null;
  /** HH:MM (24-hour local time), or null when only the day is known. */
  time: string | null;
  /** Its place in the written order (0 = first in the file). */
  order: number;
  /** Decisions: the decision number ("By number"). */
  number?: number | null;
  /** Risks: likelihood × impact ("Highest risk first"). */
  score?: number | null;
  /** Values for the tab's own filters, by filter key ("status" -> ["Accepted"]). */
  facets: Record<string, string[]>;
}

export interface FilterOption {
  value: string;
  label: string;
}

/** The address value of "Any" for a filter that starts on a value. */
export const ANY = "any";

/** A tab's own single-choice filter (status, who decided, has decisions or approvals). */
export interface ExtraFilter {
  key: string;
  label: string;
  /** What the "no choice" option says ("Any status"). */
  anyLabel: string;
  options: FilterOption[];
  /** The value the filter starts on when the address names none (Questions: "open"). */
  defaultValue?: string;
}

export const SORTS = {
  newest: "Newest first",
  oldest: "Oldest first",
  phase: "By phase",
  az: "A to Z by title",
  number: "By number",
  risk: "Highest risk first",
} as const;

export type SortKey = keyof typeof SORTS;

export function isSortKey(v: string): v is SortKey {
  return Object.prototype.hasOwnProperty.call(SORTS, v);
}

/** What a tab offers. Address values outside these lists are ignored. */
export interface BrowseSpec {
  categories: string[];
  tags: string[];
  phases: string[];
  extras: ExtraFilter[];
  /** The sort choices, in the order the dropdown lists them. */
  sorts: SortKey[];
  /** The order before you pick one (must be one of `sorts`). */
  defaultSort: SortKey;
  /** True when the tab offers "Date from" and "Date to" (its items have dates that differ). */
  dates: boolean;
  /** Phase order (roadmap order) for "By phase"; a phase not listed comes after the listed ones. */
  phaseOrder: string[];
  /**
   * Put before every address key of this list ("risk-" gives "risk-q", "risk-page"), so two lists on
   * one tab (Decisions and Risks) keep separate choices in one address. Empty or absent: no prefix.
   */
  prefix?: string;
}

export interface BrowseState {
  q: string;
  category: string | null;
  tags: string[];
  phase: string | null;
  from: string | null;
  to: string | null;
  /**
   * Chosen value per extra filter key. A key that is absent means "any". For a filter with a
   * `defaultValue` the key is always present: an option value or ANY.
   */
  extra: Record<string, string>;
  sort: SortKey;
  /** 1-based. */
  page: number;
}

/** Keys the browse state uses in the page address. */
export const PARAM = { q: "q", category: "category", tag: "tag", phase: "phase", from: "from", to: "to", sort: "sort", page: "page" } as const;

const MAX_QUERY = 200;

/** The address key of a state field for this list ("q", or "risk-q" with the prefix "risk-"). */
export function paramKey(spec: Pick<BrowseSpec, "prefix">, key: string): string {
  return `${spec.prefix ?? ""}${key}`;
}

/**
 * Does this list own an address key? A list with a prefix owns the keys that start with it; a list
 * without one owns every key that has no "word-" prefix, so it also tidies unknown keys away.
 */
export function ownsKey(spec: Pick<BrowseSpec, "prefix">, key: string): boolean {
  return spec.prefix ? key.startsWith(spec.prefix) : !/^[a-z]+-/.test(key);
}

/** This list's part of an address ("?tag=memory"), in the address's order, or "". */
export function ownPart(query: string, spec: Pick<BrowseSpec, "prefix">): string {
  const out = new URLSearchParams();
  for (const [k, v] of new URLSearchParams(query)) if (ownsKey(spec, k)) out.append(k, v);
  const s = out.toString();
  return s ? `?${s}` : "";
}

/**
 * The whole address after this list writes its part: the keys of other lists on the tab are kept as
 * they are, this list's keys are replaced by `own` (a stateToQuery result).
 */
export function mergeQuery(current: string, own: string, spec: Pick<BrowseSpec, "prefix">): string {
  const out = new URLSearchParams();
  for (const [k, v] of new URLSearchParams(current)) if (!ownsKey(spec, k)) out.append(k, v);
  for (const [k, v] of new URLSearchParams(own)) out.append(k, v);
  const s = out.toString();
  return s ? `?${s}` : "";
}

/** True for a real calendar date written YYYY-MM-DD. */
export function isIsoDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}

/** True for a 24-hour clock time written HH:MM ("09:05", "21:41"). */
export function isClockTime(s: string): boolean {
  return /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(s);
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

/** The state a tab starts in: nothing typed, its own starting filter values, its starting order, page 1. */
export function initialState(spec: BrowseSpec): BrowseState {
  const extra: Record<string, string> = {};
  for (const f of spec.extras) if (f.defaultValue !== undefined) extra[f.key] = f.defaultValue;
  return { q: "", category: null, tags: [], phase: null, from: null, to: null, extra, sort: spec.defaultSort, page: 1 };
}

/** The state "Clear filters" gives: no search, every filter on "any"; the order stays. Page 1. */
export function clearedState(s: BrowseState, spec: BrowseSpec): BrowseState {
  const extra: Record<string, string> = {};
  for (const f of spec.extras) if (f.defaultValue !== undefined) extra[f.key] = ANY;
  return { q: "", category: null, tags: [], phase: null, from: null, to: null, extra, sort: s.sort, page: 1 };
}

/** The extra filters that narrow the list now (a key on ANY does not). */
function activeExtras(s: BrowseState): [string, string][] {
  return Object.entries(s.extra).filter(([, v]) => v !== ANY);
}

/** True when the state narrows the list in any way (the sort and the page number do not count). */
export function isFiltered(s: BrowseState): boolean {
  return (
    searchWords(s.q).length > 0 ||
    s.category !== null ||
    s.tags.length > 0 ||
    s.phase !== null ||
    s.from !== null ||
    s.to !== null ||
    activeExtras(s).length > 0
  );
}

/** True when both dates are set and "Date from" is after "Date to" (nothing can match). */
export function datesReversed(s: BrowseState): boolean {
  return s.from !== null && s.to !== null && s.from > s.to;
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
    activeExtras(s).length
  );
}

/** Reads a state from the page address. Unknown keys and values outside the spec are ignored. */
export function parseState(params: URLSearchParams | string, spec: BrowseSpec): BrowseState {
  const p = typeof params === "string" ? new URLSearchParams(params) : params;
  const key = (k: string) => paramKey(spec, k);
  const one = (k: string): string | null => {
    const v = p.get(key(k));
    return v === null ? null : v.trim();
  };
  const q = (p.get(key(PARAM.q)) ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY);
  const cat = one(PARAM.category);
  const phase = one(PARAM.phase);
  const tags: string[] = [];
  for (const t of p.getAll(key(PARAM.tag))) {
    const v = t.trim();
    if (spec.tags.includes(v) && !tags.includes(v)) tags.push(v);
  }
  // Keep the tags in the spec's order, so the same choice always gives the same address.
  tags.sort((a, b) => spec.tags.indexOf(a) - spec.tags.indexOf(b));
  const date = (k: string) => {
    if (!spec.dates) return null;
    const v = one(k);
    return v !== null && isIsoDate(v) ? v : null;
  };
  const extra: Record<string, string> = {};
  for (const f of spec.extras) {
    const v = one(f.key);
    if (v !== null && f.options.some((o) => o.value === v)) extra[f.key] = v;
    else if (f.defaultValue !== undefined) extra[f.key] = v === ANY ? ANY : f.defaultValue;
  }
  const sortRaw = one(PARAM.sort);
  const sort = sortRaw !== null && isSortKey(sortRaw) && spec.sorts.includes(sortRaw) ? sortRaw : spec.defaultSort;
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
    sort,
    page,
  };
}

/**
 * The page address for a state ("?q=tab+sleep&tag=memory&sort=oldest&page=2"), or "" when the tab is
 * as it starts. Empty values, starting values and page 1 are left out; extras come in the spec's order.
 */
export function stateToQuery(s: BrowseState, spec: BrowseSpec): string {
  const p = new URLSearchParams();
  const key = (k: string) => paramKey(spec, k);
  const q = s.q.replace(/\s+/g, " ").trim();
  if (q) p.set(key(PARAM.q), q);
  if (s.category) p.set(key(PARAM.category), s.category);
  for (const t of s.tags) p.append(key(PARAM.tag), t);
  if (s.phase) p.set(key(PARAM.phase), s.phase);
  if (spec.dates && s.from) p.set(key(PARAM.from), s.from);
  if (spec.dates && s.to) p.set(key(PARAM.to), s.to);
  for (const f of spec.extras) {
    const v = s.extra[f.key];
    if (f.defaultValue !== undefined) {
      if (v !== undefined && v !== f.defaultValue) p.set(key(f.key), v);
    } else if (v !== undefined && v !== ANY) {
      p.set(key(f.key), v);
    }
  }
  if (s.sort !== spec.defaultSort) p.set(key(PARAM.sort), s.sort);
  if (s.page > 1) p.set(key(PARAM.page), String(s.page));
  const out = p.toString();
  return out ? `?${out}` : "";
}

/** A changed state. Any change other than the page itself goes back to page 1. */
export function update(s: BrowseState, patch: Partial<BrowseState>): BrowseState {
  const next = { ...s, ...patch };
  if (patch.page === undefined) next.page = 1;
  return next;
}

/** The state with one extra filter set to a value, or to "any" (empty value). Back to page 1. */
export function withExtra(s: BrowseState, f: ExtraFilter, value: string): BrowseState {
  const extra = { ...s.extra };
  if (value && value !== ANY) extra[f.key] = value;
  else if (f.defaultValue !== undefined) extra[f.key] = ANY;
  else delete extra[f.key];
  return update(s, { extra });
}

/** The value a filter's dropdown shows: an option value, or "" for "any". */
export function extraValue(s: BrowseState, f: ExtraFilter): string {
  const v = s.extra[f.key];
  return v === undefined || v === ANY ? "" : v;
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
  if (s.phase !== null && !item.phases.includes(s.phase)) return false;
  for (const t of s.tags) if (!item.tags.includes(t)) return false;
  if (s.from !== null && (item.date === null || item.date < s.from)) return false;
  if (s.to !== null && (item.date === null || item.date > s.to)) return false;
  for (const [k, v] of activeExtras(s)) if (!(item.facets[k] ?? []).includes(v)) return false;
  for (const w of words) if (!item.text.includes(w)) return false;
  return true;
}

/** The items that pass, in their original order. */
export function filterItems<T extends BrowseItem>(items: readonly T[], s: BrowseState): T[] {
  const words = searchWords(s.q);
  return items.filter((i) => matches(i, s, words));
}

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

/** Item ids compared as people read them ("risk-r2" before "risk-r10"); the last tiebreak of every order. */
export function compareIds(a: string, b: string): number {
  return collator.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0);
}

/** Oldest first: date, then time (an entry with a time comes after the untimed ones of its day), then written order. */
function compareOldest(a: BrowseItem, b: BrowseItem): number {
  const da = a.date ?? "";
  const db = b.date ?? "";
  if (da !== db) return da < db ? -1 : 1;
  const ta = a.time ?? "";
  const tb = b.time ?? "";
  if (ta !== tb) return ta < tb ? -1 : 1;
  return a.order - b.order;
}

/** The place of an item's earliest phase in the roadmap; items without a phase come last. */
export function phaseRank(item: Pick<BrowseItem, "phases">, phaseOrder: readonly string[]): number {
  if (item.phases.length === 0) return Number.POSITIVE_INFINITY;
  let best = Number.POSITIVE_INFINITY;
  for (const p of item.phases) {
    const i = phaseOrder.indexOf(p);
    // A phase the roadmap does not list sorts after every listed one, still before "no phase".
    best = Math.min(best, i >= 0 ? i : phaseOrder.length);
  }
  return best;
}

const byNumberAsc = (x: number) => (Number.isFinite(x) ? x : Number.POSITIVE_INFINITY);

/** The items in the chosen order (a new array). */
export function sortItems<T extends BrowseItem>(items: readonly T[], sort: SortKey, phaseOrder: readonly string[] = []): T[] {
  const cmp = (a: T, b: T): number => {
    switch (sort) {
      case "newest":
        return compareOldest(b, a) || compareIds(a.id, b.id);
      case "oldest":
        return compareOldest(a, b) || compareIds(a.id, b.id);
      case "phase": {
        const ra = phaseRank(a, phaseOrder);
        const rb = phaseRank(b, phaseOrder);
        if (ra !== rb) return ra < rb ? -1 : 1;
        return a.order - b.order || compareIds(a.id, b.id);
      }
      case "az":
        return collator.compare(a.title, b.title) || compareIds(a.id, b.id);
      case "number": {
        const na = byNumberAsc(a.number ?? Number.NaN);
        const nb = byNumberAsc(b.number ?? Number.NaN);
        if (na !== nb) return na < nb ? -1 : 1;
        return a.order - b.order || compareIds(a.id, b.id);
      }
      case "risk": {
        const sa = a.score ?? Number.NEGATIVE_INFINITY;
        const sb = b.score ?? Number.NEGATIVE_INFINITY;
        if (sa !== sb) return sa > sb ? -1 : 1;
        return compareIds(a.id, b.id);
      }
    }
  };
  return [...items].sort(cmp);
}

/** The items that pass, in the state's order: what the list shows, before paging. */
export function visibleItems<T extends BrowseItem>(items: readonly T[], s: BrowseState, spec: Pick<BrowseSpec, "phaseOrder">): T[] {
  return sortItems(filterItems(items, s), s.sort, spec.phaseOrder);
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

/**
 * The state with its page kept inside the pages that exist for these items, so an address asking for
 * page 99 of 2 pages shows (and then says) page 2.
 */
export function clampPage<T extends BrowseItem>(s: BrowseState, items: readonly T[]): BrowseState {
  const page = pageInfo(filterItems(items, s).length, s.page).page;
  return page === s.page ? s : { ...s, page };
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

/**
 * A short note under the Sort menu when "Newest first" or "Oldest first" is chosen on a list whose
 * items carry no date (Risks, Research): then those sorts follow the written order, and the owner
 * should be told why (review 2026-10-11). Null when the sort uses real dates or is another sort.
 */
export function sortNote(sort: SortKey, items: readonly Pick<BrowseItem, "date">[], noun: string): string | null {
  if (sort !== "newest" && sort !== "oldest") return null;
  if (items.length === 0 || items.some((i) => i.date)) return null;
  return sort === "newest"
    ? `The ${noun} have no date, so this shows the last written first.`
    : `The ${noun} have no date, so this shows the first written first.`;
}

/**
 * True when a tab filter (`key`) splits the items exactly as the category does: every category has one
 * value and every value one category (Research: each kind has one status). Such a filter would repeat
 * the category filter, so the tab leaves it out (review 2026-10-11). False with fewer than two values.
 */
export function mirrorsCategory(items: readonly Pick<BrowseItem, "category" | "facets">[], key: string): boolean {
  const byCat = new Map<string, Set<string>>();
  const byVal = new Map<string, Set<string>>();
  const add = (m: Map<string, Set<string>>, k: string, v: string) => {
    const set = m.get(k) ?? new Set<string>();
    set.add(v);
    m.set(k, set);
  };
  for (const it of items) {
    const cat = it.category ?? "";
    for (const v of it.facets[key] ?? []) {
      add(byCat, cat, v);
      add(byVal, v, cat);
    }
  }
  if (byVal.size < 2) return false;
  return [...byCat.values()].every((s) => s.size === 1) && [...byVal.values()].every((s) => s.size === 1);
}
