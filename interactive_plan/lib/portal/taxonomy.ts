/**
 * The fixed lists the Decisions and Log tabs sort their items by (owner request 2026-10-10,
 * wiki/raw/owner/2026-10-10-s01-decisions-log-browse.md): the decision categories (by topic), the log
 * categories (by kind of work) and the tags. Their single source is plan/portal/taxonomy.json. Each list
 * may hold plain names or { name, explains } records; both read the same here. The loader validates the
 * file with the zod schema generated from plan/portal/schema/taxonomy.schema.json.
 *
 * Each decision and log entry carries `category`, two `tags` and (decisions) a `phase`. `labelsOf` reads
 * them from any item without depending on the generated schema types, so the pages work before and after
 * the JSON Schemas list the new fields.
 * No file access: safe to import from client code.
 */
/** A list entry as taxonomy.json may write it: a plain name, or a name with a one-line explanation. */
export type TermLike = string | { name: string; explains?: string | null };

/** The part of taxonomy.json this module reads (validated by TaxonomyFile in schemas.gen.ts). */
export interface TaxonomyRaw {
  decision_categories: readonly TermLike[];
  log_categories: readonly TermLike[];
  tags: readonly TermLike[];
}

export interface TaxonomyTerm {
  name: string;
  /** One plain line, or null when the file gives none. */
  explains: string | null;
}

export interface TaxonomyLists {
  decisionCategories: TaxonomyTerm[];
  logCategories: TaxonomyTerm[];
  tags: TaxonomyTerm[];
}

function terms(list: readonly TermLike[]): TaxonomyTerm[] {
  const seen = new Set<string>();
  const out: TaxonomyTerm[] = [];
  for (const t of list) {
    const term = typeof t === "string" ? { name: t, explains: null } : { name: t.name, explains: t.explains ?? null };
    if (seen.has(term.name)) continue;
    seen.add(term.name);
    out.push(term);
  }
  return out;
}

/** The lists in one shape, duplicates dropped (first one wins). Null in, null out. */
export function normalizeTaxonomy(raw: TaxonomyRaw | null): TaxonomyLists | null {
  if (!raw) return null;
  return { decisionCategories: terms(raw.decision_categories), logCategories: terms(raw.log_categories), tags: terms(raw.tags) };
}

export interface ItemLabels {
  category: string | null;
  tags: string[];
  phase: string | null;
}

/** The category, tags and phase of a decision or log entry; missing or malformed fields read as empty. */
export function labelsOf(item: object): ItemLabels {
  const r = item as { category?: unknown; tags?: unknown; phase?: unknown };
  const str = (v: unknown) => (typeof v === "string" && v.length > 0 ? v : null);
  const tags = Array.isArray(r.tags) ? [...new Set(r.tags.filter((t): t is string => typeof t === "string" && t.length > 0))] : [];
  return { category: str(r.category), tags, phase: str(r.phase) };
}

/**
 * The names a filter offers: the taxonomy's list when there is one, else the names the items use
 * (sorted), so the tab still works while taxonomy.json is missing.
 */
export function offered(list: TaxonomyTerm[] | null | undefined, used: Iterable<string | null>): TaxonomyTerm[] {
  if (list && list.length > 0) return list;
  const names = [...new Set([...used].filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b));
  return names.map((name) => ({ name, explains: null }));
}

/**
 * Like `offered`, but only the names at least one item uses (in the taxonomy's order), so a filter never
 * offers a choice that always gives "No matches". A name in use that the taxonomy lacks comes last.
 */
export function offeredInUse(list: TaxonomyTerm[] | null | undefined, used: Iterable<string | null>): TaxonomyTerm[] {
  const inUse = new Set([...used].filter((x): x is string => !!x));
  const out = offered(list, inUse).filter((t) => inUse.has(t.name));
  const known = new Set(out.map((t) => t.name));
  const extra = [...inUse].filter((n) => !known.has(n)).sort((a, b) => a.localeCompare(b));
  return [...out, ...extra.map((name) => ({ name, explains: null }))];
}
