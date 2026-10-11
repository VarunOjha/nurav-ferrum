/**
 * What the Decisions and Log tabs hand to the browse component (components/portal/browse/Browse.tsx):
 * one BrowseItem per decision or log entry, the filters the tab offers and their plain labels.
 * Pure: the pages pass in the files they already loaded.
 */
import type { Decisions, Log, Roadmap } from "./schemas.gen";
import { searchText, type BrowseItem, type BrowseSpec, type ExtraFilter, type FilterOption } from "./browse";
import { labelsOf, offered, offeredInUse, type TaxonomyLists, type TaxonomyTerm } from "./taxonomy";

export interface TabBrowse {
  items: BrowseItem[];
  spec: BrowseSpec;
  categories: TaxonomyTerm[];
  tags: TaxonomyTerm[];
  phases: FilterOption[];
}

/** Phase choices: the phases the items name, in roadmap order, as "P0 · Planning". */
export function phaseOptions(used: Iterable<string | null>, roadmap: Roadmap | null): FilterOption[] {
  const ids = new Set([...used].filter((x): x is string => !!x));
  const out: FilterOption[] = [];
  for (const p of roadmap?.phases ?? []) {
    if (!ids.has(p.id)) continue;
    out.push({ value: p.id, label: `${p.short} · ${p.name}` });
    ids.delete(p.id);
  }
  for (const id of [...ids].sort()) out.push({ value: id, label: id });
  return out;
}

const STATUS_ORDER = ["Accepted", "Proposed", "Replaced", "Rejected"] as const;

/** The two filters only the Decisions tab has: status and who decided. */
export function decisionExtras(items: Decisions["items"]): ExtraFilter[] {
  const present = new Set(items.map((d) => d.status));
  // Accepted, Proposed and Replaced are always offered (owner's plan); Rejected only when one exists.
  const statuses = STATUS_ORDER.filter((s) => s !== "Rejected" || present.has(s));
  return [
    { key: "status", label: "Status", anyLabel: "Any status", options: statuses.map((s) => ({ value: s, label: s })) },
    {
      key: "by",
      label: "Who decided",
      anyLabel: "Anyone",
      options: [
        { value: "you", label: "You" },
        { value: "claude", label: "Claude" },
      ],
    },
  ];
}

/** The filter only the Log tab has (kept from the first Log design): has decisions, has approvals. */
export const LOG_EXTRAS: ExtraFilter[] = [
  {
    key: "has",
    label: "Show",
    anyLabel: "All entries",
    options: [
      { value: "decisions", label: "Has decisions" },
      { value: "approvals", label: "Has approvals" },
    ],
  },
];

/** Decisions in file order. Search covers title, meaning, why and the catch. */
export function decisionsBrowse(decisions: Decisions | null, taxonomy: TaxonomyLists | null, roadmap: Roadmap | null): TabBrowse {
  const list = decisions?.items ?? [];
  const items: BrowseItem[] = list.map((d) => {
    const l = labelsOf(d);
    return {
      id: d.id,
      text: searchText(d.title, d.summary, d.why, d.catch),
      category: l.category,
      tags: l.tags,
      phase: l.phase,
      date: d.date,
      facets: { status: [d.status], by: [d.decided_by] },
    };
  });
  return build(items, taxonomy?.decisionCategories, taxonomy?.tags, roadmap, decisionExtras(list));
}

/** Log entries in the order given (the page passes them newest first). Search covers title, done, next and the decisions. */
export function logBrowse(entries: Log["entries"], taxonomy: TaxonomyLists | null, roadmap: Roadmap | null): TabBrowse {
  const items: BrowseItem[] = entries.map((e) => {
    const l = labelsOf(e);
    const has: string[] = [];
    if (e.decisions.length > 0) has.push("decisions");
    if (e.approvals.length > 0) has.push("approvals");
    return {
      id: e.id,
      text: searchText(e.title, e.done, e.next, ...e.decisions.map((d) => d.what)),
      category: l.category,
      tags: l.tags,
      phase: l.phase,
      date: e.date,
      facets: { has },
    };
  });
  return build(items, taxonomy?.logCategories, taxonomy?.tags, roadmap, LOG_EXTRAS);
}

function build(
  items: BrowseItem[],
  categoryList: TaxonomyTerm[] | undefined,
  tagList: TaxonomyTerm[] | undefined,
  roadmap: Roadmap | null,
  extras: ExtraFilter[],
): TabBrowse {
  const categories = offered(
    categoryList,
    items.map((i) => i.category),
  );
  // Only the tags in use on this tab: a tag nobody has would always give "No matches".
  const tags = offeredInUse(
    tagList,
    items.flatMap((i) => i.tags),
  );
  const phases = phaseOptions(
    items.map((i) => i.phase),
    roadmap,
  );
  return {
    items,
    spec: { categories: categories.map((c) => c.name), tags: tags.map((t) => t.name), phases: phases.map((p) => p.value), extras },
    categories,
    tags,
    phases,
  };
}
