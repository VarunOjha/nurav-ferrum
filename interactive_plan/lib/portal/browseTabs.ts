/**
 * What each list hands to the browse component (components/portal/browse/Browse.tsx): one BrowseItem
 * per log entry, question, decision, risk or research item, the filters and sort choices the tab
 * offers, and their plain labels (owner's plan of 2026-10-10, "one pattern for every list",
 * wiki/raw/owner/2026-10-10-s01-browse-v2-approval.md). The per-tab rules live here, in one place:
 *
 * | Tab       | searched                                  | own filters             | dates | sorts (first = start)                   |
 * |-----------|-------------------------------------------|-------------------------|-------|-----------------------------------------|
 * | Log       | title, done, next, decisions              | Show (decisions/approv.) | yes   | Newest, Oldest, By phase, A to Z         |
 * | Questions | id, question, why it matters, answer      | Status (starts on Open) | yes   | Newest, Oldest, By phase, A to Z         |
 * | Decisions | title, meaning, why, the catch            | Status, Who decided     | yes   | Newest, Oldest, By phase, A to Z, Number |
 * | Risks     | title, what could happen, what we do      | Status                  | no    | Highest risk, Newest, Oldest, ...        |
 * | Research  | title, details, kind                      | Status                  | no    | By phase, Newest, Oldest, A to Z         |
 *
 * Pure: the pages pass in the files they already loaded.
 */
import type { Decisions, Log, Questions, Research, Risks, Roadmap } from "./schemas.gen";
import { plainText, riskScore } from "./view";
import { searchText, SORTS, type BrowseItem, type BrowseSpec, type ExtraFilter, type FilterOption, type SortKey } from "./browse";
import { labelsOf, offered, offeredInUse, RESEARCH_KINDS, timeOf, type TaxonomyLists, type TaxonomyTerm } from "./taxonomy";

export interface TabBrowse {
  items: BrowseItem[];
  spec: BrowseSpec;
  categories: TaxonomyTerm[];
  tags: TaxonomyTerm[];
  phases: FilterOption[];
  sorts: FilterOption[];
}

/** One tab's fixed rules. */
export interface TabConfig {
  /** Sort choices in dropdown order. */
  sorts: SortKey[];
  defaultSort: SortKey;
  /** Whether the tab can offer a date range (it still hides it when every item has the same day). */
  dates: boolean;
  /** Address key prefix, for a list that shares its tab with another list (Risks on the Decisions tab). */
  prefix?: string;
}

const BASE_SORTS: SortKey[] = ["newest", "oldest", "phase", "az"];

export const TAB_CONFIG = {
  log: { sorts: BASE_SORTS, defaultSort: "newest", dates: true },
  questions: { sorts: BASE_SORTS, defaultSort: "newest", dates: true },
  decisions: { sorts: [...BASE_SORTS, "number"], defaultSort: "newest", dates: true },
  risks: { sorts: ["risk", ...BASE_SORTS], defaultSort: "risk", dates: false, prefix: "risk-" },
  research: { sorts: ["phase", "newest", "oldest", "az"], defaultSort: "phase", dates: false },
} as const satisfies Record<string, TabConfig>;

export type TabName = keyof typeof TAB_CONFIG;

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

const DECISION_STATUS_ORDER = ["Accepted", "Proposed", "Replaced", "Rejected"] as const;

/** The two filters only the Decisions tab has: status and who decided. */
export function decisionExtras(items: Decisions["items"]): ExtraFilter[] {
  const present = new Set(items.map((d) => d.status));
  // Accepted, Proposed and Replaced are always offered (owner's plan); Rejected only when one exists.
  const statuses = DECISION_STATUS_ORDER.filter((s) => s !== "Rejected" || present.has(s));
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

/** Question statuses as the Questions tab says them. */
export const QUESTION_STATUS: Record<Questions["items"][number]["status"], string> = { open: "Open", answered: "Answered", withdrawn: "Withdrawn" };

/** The Questions tab's status filter: it starts on Open (owner's answer); "Any status" shows all. */
export const QUESTION_EXTRAS: ExtraFilter[] = [
  {
    key: "status",
    label: "Status",
    anyLabel: "Any status",
    defaultValue: "open",
    options: (Object.keys(QUESTION_STATUS) as (keyof typeof QUESTION_STATUS)[]).map((s) => ({ value: s, label: QUESTION_STATUS[s] })),
  },
];

const RISK_STATUS_ORDER = ["Open", "Being reduced", "Happened", "Resolved", "Accepted"] as const;

/** A status filter over the statuses in use, in the given order (unknown ones last, sorted). */
function statusFilter(used: Iterable<string>, order: readonly string[] = []): ExtraFilter {
  const present = new Set(used);
  const known = order.filter((s) => present.has(s));
  const rest = [...present].filter((s) => !order.includes(s)).sort((a, b) => a.localeCompare(b));
  return { key: "status", label: "Status", anyLabel: "Any status", options: [...known, ...rest].map((s) => ({ value: s, label: s })) };
}

/** Decisions in file order. Search covers title, meaning, why and the catch. */
export function decisionsBrowse(decisions: Decisions | null, taxonomy: TaxonomyLists | null, roadmap: Roadmap | null): TabBrowse {
  const list = decisions?.items ?? [];
  const items: BrowseItem[] = list.map((d, order) => {
    const l = labelsOf(d);
    return {
      id: d.id,
      text: searchText(d.title, d.summary, d.why, d.catch),
      title: plainText(d.title),
      category: l.category,
      tags: l.tags,
      phases: l.phase ? [l.phase] : [],
      date: d.date,
      time: timeOf(d),
      order,
      number: d.number,
      facets: { status: [d.status], by: [d.decided_by] },
    };
  });
  return build("decisions", items, taxonomy?.decisionCategories, taxonomy?.tags, roadmap, decisionExtras(list));
}

/** Log entries in file order (oldest first, as log.json is written). Search covers title, done, next and the decisions. */
export function logBrowse(entries: Log["entries"], taxonomy: TaxonomyLists | null, roadmap: Roadmap | null): TabBrowse {
  const items: BrowseItem[] = entries.map((e, order) => {
    const l = labelsOf(e);
    const has: string[] = [];
    if (e.decisions.length > 0) has.push("decisions");
    if (e.approvals.length > 0) has.push("approvals");
    return {
      id: e.id,
      text: searchText(e.title, e.done, e.next, ...e.decisions.map((d) => d.what)),
      title: plainText(e.title),
      category: l.category,
      tags: l.tags,
      phases: l.phase ? [l.phase] : [],
      date: e.date,
      time: timeOf(e),
      order,
      facets: { has },
    };
  });
  return build("log", items, taxonomy?.logCategories, taxonomy?.tags, roadmap, LOG_EXTRAS);
}

/**
 * Questions in file order (the order of the questions page). The phase is the phase(s) the question
 * holds up. Search covers the id, the question, why it matters and the answer.
 */
export function questionsBrowse(questions: Questions | null, taxonomy: TaxonomyLists | null, roadmap: Roadmap | null): TabBrowse {
  const items: BrowseItem[] = (questions?.items ?? []).map((q, order) => {
    const l = labelsOf(q);
    return {
      id: q.id,
      text: searchText(q.id, q.question, q.why_it_matters, q.answer),
      title: plainText(q.question),
      category: l.category,
      tags: l.tags,
      phases: [...q.blocks],
      date: q.asked,
      time: timeOf(q),
      order,
      facets: { status: [q.status] },
    };
  });
  return build("questions", items, taxonomy?.questionCategories, taxonomy?.tags, roadmap, QUESTION_EXTRAS);
}

/** Risks in file order; the phase is the phase that handles the risk. Search covers title, what could happen and what we do. */
export function risksBrowse(risks: Risks | null, taxonomy: TaxonomyLists | null, roadmap: Roadmap | null): TabBrowse {
  const list = risks?.items ?? [];
  const items: BrowseItem[] = list.map((r, order) => {
    const l = labelsOf(r);
    return {
      id: r.id,
      text: searchText(r.title, r.summary, r.mitigation),
      title: plainText(r.title),
      category: l.category,
      tags: l.tags,
      phases: [r.phase],
      date: null,
      time: null,
      order,
      score: riskScore(r),
      facets: { status: [r.status] },
    };
  });
  return build(
    "risks",
    items,
    taxonomy?.riskCategories,
    taxonomy?.tags,
    roadmap,
    [statusFilter(
      list.map((r) => r.status),
      RISK_STATUS_ORDER,
    )],
  );
}

export type ResearchKind = keyof typeof RESEARCH_KINDS;

/** One research item of any kind, as the Research list shows it. */
export interface ResearchRow {
  kind: ResearchKind;
  item: Research[ResearchKind][number];
}

/** The five research lists as one list, in file order: questions, predictions, experiments, measures, test sites. */
export function researchRows(r: Research | null): ResearchRow[] {
  if (!r) return [];
  return (Object.keys(RESEARCH_KINDS) as ResearchKind[]).flatMap((kind) => (r[kind] as Research[ResearchKind]).map((item) => ({ kind, item })));
}

/** The kind-specific text of a research item (the question, the prediction, the unit), or null. */
export function researchDetail(row: ResearchRow): string | null {
  const i = row.item as { question?: string; prediction?: string; unit?: string };
  return i.question ?? i.prediction ?? (i.unit ? `Unit: ${i.unit}` : null);
}

/**
 * The 70 research items as one list (owner's answer: kind as category). The category is the item's
 * own `category` when it has one, else its kind. Search covers title, details and kind.
 */
export function researchBrowse(r: Research | null, taxonomy: TaxonomyLists | null, roadmap: Roadmap | null): TabBrowse {
  const rows = researchRows(r);
  const items: BrowseItem[] = rows.map((row, order) => {
    const l = labelsOf(row.item);
    const kind = RESEARCH_KINDS[row.kind];
    return {
      id: row.item.id,
      text: searchText(row.item.title, row.item.summary, researchDetail(row), kind),
      title: plainText(row.item.title),
      category: l.category ?? kind,
      tags: l.tags,
      phases: l.phase ? [l.phase] : [],
      date: null,
      time: null,
      order,
      facets: { status: [row.item.status] },
    };
  });
  return build(
    "research",
    items,
    taxonomy?.researchCategories ?? Object.values(RESEARCH_KINDS).map((name) => ({ name, explains: null })),
    taxonomy?.tags,
    roadmap,
    [statusFilter(rows.map((x) => x.item.status))],
  );
}

function build(
  tab: TabName,
  items: BrowseItem[],
  categoryList: TaxonomyTerm[] | undefined,
  tagList: TaxonomyTerm[] | undefined,
  roadmap: Roadmap | null,
  extras: ExtraFilter[],
): TabBrowse {
  const cfg: TabConfig = TAB_CONFIG[tab];
  // Only the categories and tags in use on this tab: a choice nobody has would always give "No matches".
  const categories = offeredInUse(
    offered(
      categoryList,
      items.map((i) => i.category),
    ),
    items.map((i) => i.category),
  );
  const tags = offeredInUse(
    tagList,
    items.flatMap((i) => i.tags),
  );
  const phases = phaseOptions(
    items.flatMap((i) => i.phases),
    roadmap,
  );
  const dates = cfg.dates && new Set(items.map((i) => i.date).filter(Boolean)).size > 1;
  return {
    items,
    spec: {
      categories: categories.map((c) => c.name),
      tags: tags.map((t) => t.name),
      phases: phases.map((p) => p.value),
      extras,
      sorts: [...cfg.sorts],
      defaultSort: cfg.defaultSort,
      dates,
      phaseOrder: (roadmap?.phases ?? []).map((p) => p.id),
      ...(cfg.prefix ? { prefix: cfg.prefix } : {}),
    },
    categories,
    tags,
    phases,
    sorts: cfg.sorts.map((s) => ({ value: s, label: SORTS[s] })),
  };
}
