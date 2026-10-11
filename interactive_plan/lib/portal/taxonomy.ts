/**
 * The fixed lists the portal's lists sort their items by (owner requests 2026-10-10,
 * wiki/raw/owner/2026-10-10-s01-decisions-log-browse.md and 2026-10-10-s01-browse-v2-*.md): the
 * decision categories (by topic), the log categories (by kind of work), the tags, and (since the
 * "one pattern for every list" step) the question, risk and research categories. Their single source is
 * plan/portal/taxonomy.json. Each list may hold plain names or { name, explains } records; both read the
 * same here. The loader validates the file with the zod schema generated from
 * plan/portal/schema/taxonomy.schema.json.
 *
 * The question, risk and research lists are optional here: questions and risks fall back to the
 * decision topics (the owner chose the same six topics), research to its five kinds (RESEARCH_KINDS).
 *
 * Each decision, log entry, question, risk and research item carries `category`, two `tags` and
 * (most) a `phase`; log entries and questions may carry a `time` ("HH:MM"). `labelsOf` and `timeOf`
 * read them from any item without depending on the generated schema types, so the pages work before
 * and after the JSON Schemas list the new fields.
 * No file access: safe to import from client code.
 */
/** A list entry as taxonomy.json may write it: a plain name, or a name with a one-line explanation. */
export type TermLike = string | { name: string; explains?: string | null };

/** The part of taxonomy.json this module reads (validated by TaxonomyFile in schemas.gen.ts). */
export interface TaxonomyRaw {
  decision_categories: readonly TermLike[];
  log_categories: readonly TermLike[];
  tags: readonly TermLike[];
  question_categories?: readonly TermLike[] | null;
  risk_categories?: readonly TermLike[] | null;
  research_categories?: readonly TermLike[] | null;
}

/**
 * The research category is the item's kind (owner's answer of 2026-10-10), in plain words, one per list
 * of plan/portal/research.json.
 */
export const RESEARCH_KINDS = {
  questions: "Research question",
  hypotheses: "Prediction",
  experiments: "Experiment",
  metrics: "Measure",
  workloads: "Test site",
} as const;

export interface TaxonomyTerm {
  name: string;
  /** One plain line, or null when the file gives none. */
  explains: string | null;
}

export interface TaxonomyLists {
  decisionCategories: TaxonomyTerm[];
  logCategories: TaxonomyTerm[];
  tags: TaxonomyTerm[];
  /** The file's list, else the decision topics. */
  questionCategories: TaxonomyTerm[];
  /** The file's list, else the decision topics. */
  riskCategories: TaxonomyTerm[];
  /** The file's list, else the five research kinds (without explanations). */
  researchCategories: TaxonomyTerm[];
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
  const decisionCategories = terms(raw.decision_categories);
  const optional = (list: readonly TermLike[] | null | undefined, fallback: TaxonomyTerm[]) => (Array.isArray(list) && list.length > 0 ? terms(list) : fallback);
  return {
    decisionCategories,
    logCategories: terms(raw.log_categories),
    tags: terms(raw.tags),
    questionCategories: optional(raw.question_categories, decisionCategories),
    riskCategories: optional(raw.risk_categories, decisionCategories),
    researchCategories: optional(
      raw.research_categories,
      Object.values(RESEARCH_KINDS).map((name) => ({ name, explains: null })),
    ),
  };
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

/** The optional time of day of a log entry or question: "HH:MM" (24-hour), or null when missing or malformed. */
export function timeOf(item: object): string | null {
  const t = (item as { time?: unknown }).time;
  return typeof t === "string" && /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(t) ? t : null;
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
