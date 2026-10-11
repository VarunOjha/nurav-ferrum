// Search, filters, sort and pages of every list (owner requests 2026-10-10,
// wiki/raw/owner/2026-10-10-s01-decisions-log-browse.md and 2026-10-10-s01-browse-v2-*.md): the pure
// logic in lib/portal/browse.ts, the tab builders and per-tab rules in lib/portal/browseTabs.ts and the
// taxonomy reader in lib/portal/taxonomy.ts. Uses small fixtures, not the real plan/portal files, so it
// does not depend on the labels being filled in.
import { describe, expect, it } from "vitest";
import {
  activeCount,
  ANY,
  clampPage,
  clearedState,
  compareIds,
  datesReversed,
  extraValue,
  filterItems,
  initialState,
  isClockTime,
  isFiltered,
  isIsoDate,
  matches,
  mergeQuery,
  mirrorsCategory,
  normalize,
  ownPart,
  ownsKey,
  PAGE_SIZE,
  pageInfo,
  pageNumbers,
  pageSlice,
  paramKey,
  parseState,
  phaseRank,
  resultsLine,
  searchText,
  searchWords,
  sortItems,
  sortNote,
  SORTS,
  stateToQuery,
  update,
  visibleItems,
  withExtra,
  withoutTag,
  withTag,
  type BrowseItem,
  type BrowseSpec,
  type BrowseState,
  type ExtraFilter,
} from "@/lib/portal/browse";
import {
  decisionExtras,
  decisionsBrowse,
  LOG_EXTRAS,
  logBrowse,
  phaseOptions,
  QUESTION_EXTRAS,
  questionsBrowse,
  researchBrowse,
  researchDetail,
  researchRows,
  risksBrowse,
  TAB_CONFIG,
} from "@/lib/portal/browseTabs";
import type { Decisions, Log, Questions, Research, Risks, Roadmap } from "@/lib/portal/schemas.gen";
import { TaxonomyFile } from "@/lib/portal/schemas.gen";
import { labelsOf, normalizeTaxonomy, offered, offeredInUse, RESEARCH_KINDS, timeOf } from "@/lib/portal/taxonomy";

const SPEC: BrowseSpec = {
  categories: ["The app", "Plan portal"],
  tags: ["tabs", "memory", "CPU", "portal"],
  phases: ["phase-p0-planning", "phase-p1-foundation"],
  extras: [
    {
      key: "status",
      label: "Status",
      anyLabel: "Any status",
      options: [
        { value: "Accepted", label: "Accepted" },
        { value: "Proposed", label: "Proposed" },
      ],
    },
  ],
  sorts: ["newest", "oldest", "phase", "az", "number"],
  defaultSort: "newest",
  dates: true,
  phaseOrder: ["phase-p0-planning", "phase-p1-foundation", "phase-p2-minimal-container"],
};

/** A status filter that starts on "open", as on the Questions tab. */
const STATUS_DEFAULT: ExtraFilter = {
  key: "status",
  label: "Status",
  anyLabel: "Any status",
  defaultValue: "open",
  options: [
    { value: "open", label: "Open" },
    { value: "answered", label: "Answered" },
  ],
};
const Q_SPEC: BrowseSpec = { ...SPEC, extras: [STATUS_DEFAULT], sorts: ["newest", "oldest"] };

function item(id: string, over: Partial<BrowseItem> = {}): BrowseItem {
  return {
    id,
    text: searchText(`Item ${id}`),
    title: `Item ${id}`,
    category: "The app",
    tags: ["tabs", "memory"],
    phases: ["phase-p0-planning"],
    date: "2026-10-09",
    time: null,
    order: 0,
    facets: { status: ["Accepted"] },
    ...over,
  };
}

const EMPTY: BrowseState = initialState(SPEC);
const state = (over: Partial<BrowseState> = {}): BrowseState => ({ ...EMPTY, ...over });
const ids = (list: readonly { id: string }[]) => list.map((i) => i.id);

describe("text and words", () => {
  it("normalize drops link markup, case, accents and extra spaces", () => {
    expect(normalize("  See [the Portal rule](ref:adr-0023)   NOW  ")).toBe("see the portal rule now");
    expect(normalize("Café Déjà")).toBe("cafe deja");
  });

  it("searchText joins the parts and skips empty ones", () => {
    expect(searchText("Title", null, undefined, "", "Why")).toBe("title why");
  });

  it("searchWords splits on spaces, drops repeats, blank gives none", () => {
    expect(searchWords("  Tab  SLEEP tab ")).toEqual(["tab", "sleep"]);
    expect(searchWords("   ")).toEqual([]);
  });

  it("isIsoDate accepts only real calendar days", () => {
    expect(isIsoDate("2026-10-09")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("9 Oct")).toBe(false);
  });

  it("isClockTime accepts only 24-hour HH:MM times", () => {
    for (const t of ["00:00", "09:05", "21:41", "23:59"]) expect(isClockTime(t), t).toBe(true);
    for (const t of ["24:00", "9:05", "21:60", "21:41:00", "", "noon"]) expect(isClockTime(t), t).toBe(false);
  });
});

describe("matching", () => {
  it("every typed word must appear, case-insensitive, in any order", () => {
    const it1 = item("a", { text: searchText("Tab sleeping saves memory", "Why: background tabs") });
    expect(matches(it1, state({ q: "MEMORY tab" }))).toBe(true);
    expect(matches(it1, state({ q: "memory cpu" }))).toBe(false);
    expect(matches(it1, state({ q: "" }))).toBe(true);
  });

  it("category, phase, tags (all chosen), dates (both ends included) and extras", () => {
    const x = item("x", { date: "2026-10-09" });
    expect(matches(x, state({ category: "The app" }))).toBe(true);
    expect(matches(x, state({ category: "Plan portal" }))).toBe(false);
    expect(matches(x, state({ phase: "phase-p1-foundation" }))).toBe(false);
    expect(matches(x, state({ tags: ["tabs"] }))).toBe(true);
    expect(matches(x, state({ tags: ["tabs", "memory"] }))).toBe(true);
    expect(matches(x, state({ tags: ["tabs", "CPU"] }))).toBe(false);
    expect(matches(x, state({ from: "2026-10-09", to: "2026-10-09" }))).toBe(true);
    expect(matches(x, state({ from: "2026-10-10" }))).toBe(false);
    expect(matches(x, state({ to: "2026-10-08" }))).toBe(false);
    expect(matches(x, state({ extra: { status: "Accepted" } }))).toBe(true);
    expect(matches(x, state({ extra: { status: "Proposed" } }))).toBe(false);
    expect(matches(x, state({ extra: { status: ANY } }))).toBe(true);
    expect(matches(item("y", { facets: {} }), state({ extra: { status: "Accepted" } }))).toBe(false);
  });

  it("a question that holds up several phases matches each; no phase never matches a phase", () => {
    const two = item("two", { phases: ["phase-p1-foundation", "phase-p2-minimal-container"] });
    expect(matches(two, state({ phase: "phase-p2-minimal-container" }))).toBe(true);
    expect(matches(two, state({ phase: "phase-p1-foundation" }))).toBe(true);
    expect(matches(item("none", { phases: [] }), state({ phase: "phase-p0-planning" }))).toBe(false);
  });

  it("an item without a date never passes a date filter", () => {
    expect(matches(item("nodate", { date: null }), state({ from: "2026-01-01" }))).toBe(false);
    expect(matches(item("nodate", { date: null }), state())).toBe(true);
  });

  it("filterItems keeps the original order", () => {
    const list = [item("1", { category: "Plan portal" }), item("2"), item("3", { category: "Plan portal" })];
    expect(ids(filterItems(list, state({ category: "Plan portal" })))).toEqual(["1", "3"]);
  });

  it("isFiltered and activeCount ignore the page number and the sort", () => {
    expect(isFiltered(state({ page: 3 }))).toBe(false);
    expect(isFiltered(state({ sort: "az" }))).toBe(false);
    expect(isFiltered(state({ q: "   " }))).toBe(false);
    expect(isFiltered(state({ q: "x" }))).toBe(true);
    expect(isFiltered(state({ to: "2026-10-01" }))).toBe(true);
    expect(isFiltered(state({ extra: { status: "Accepted" } }))).toBe(true);
    // A filter on "any" does not narrow; a starting value ("Open") does.
    expect(isFiltered(state({ extra: { status: ANY } }))).toBe(false);
    expect(isFiltered(initialState(Q_SPEC))).toBe(true);
    expect(activeCount(initialState(Q_SPEC))).toBe(1);
    expect(activeCount(state({ q: "x", category: "The app", tags: ["tabs", "CPU"], phase: "p", from: "2026-01-01", to: "2026-02-01", extra: { status: "Accepted" } }))).toBe(8);
    expect(activeCount(state())).toBe(0);
  });
});

describe("address (URL query)", () => {
  it("parses every known key", () => {
    const s = parseState("?q=tab+sleep&category=The+app&tag=memory&tag=tabs&phase=phase-p1-foundation&from=2026-10-01&to=2026-10-09&status=Proposed&sort=az&page=2", SPEC);
    expect(s).toEqual({
      q: "tab sleep",
      category: "The app",
      tags: ["tabs", "memory"], // in the list's order
      phase: "phase-p1-foundation",
      from: "2026-10-01",
      to: "2026-10-09",
      extra: { status: "Proposed" },
      sort: "az",
      page: 2,
    });
  });

  it("ignores unknown keys and values outside the lists", () => {
    const s = parseState("?category=Nope&tag=nope&tag=CPU&tag=CPU&phase=phase-p9-x&from=2026-02-30&to=yesterday&status=Maybe&sort=up&page=0&foo=bar", SPEC);
    expect(s).toEqual({ ...EMPTY, tags: ["CPU"] });
    expect(parseState("?page=-1", SPEC).page).toBe(1);
    expect(parseState("?page=abc", SPEC).page).toBe(1);
    expect(parseState("?page=1.5", SPEC).page).toBe(1);
    expect(parseState("?page=9999999", SPEC).page).toBe(1);
    expect(parseState(new URLSearchParams("q=" + "x".repeat(300)), SPEC).q).toHaveLength(200);
  });

  it("writes a short, stable address and reads it back", () => {
    expect(stateToQuery(state(), SPEC)).toBe("");
    expect(stateToQuery(state({ page: 1, q: "  " }), SPEC)).toBe("");
    const s = state({ q: " memory  saving ", category: "The app", tags: ["tabs", "CPU"], phase: "phase-p0-planning", from: "2026-10-01", to: "2026-10-10", extra: { status: "Accepted", unknown: "x" }, sort: "oldest", page: 2 });
    const q = stateToQuery(s, SPEC);
    expect(q).toBe("?q=memory+saving&category=The+app&tag=tabs&tag=CPU&phase=phase-p0-planning&from=2026-10-01&to=2026-10-10&status=Accepted&sort=oldest&page=2");
    expect(stateToQuery(parseState(q, SPEC), SPEC)).toBe(q);
  });

  it("sort: a known choice of this tab is read and written; the starting order is left out", () => {
    expect(parseState("", SPEC).sort).toBe("newest");
    expect(parseState("?sort=oldest", SPEC).sort).toBe("oldest");
    expect(parseState("?sort=number", SPEC).sort).toBe("number");
    // "risk" exists, but not on this tab; unknown values are ignored.
    expect(parseState("?sort=risk", SPEC).sort).toBe("newest");
    expect(parseState("?sort=sideways", SPEC).sort).toBe("newest");
    expect(stateToQuery(state({ sort: "newest" }), SPEC)).toBe("");
    expect(stateToQuery(state({ sort: "az", page: 2 }), SPEC)).toBe("?sort=az&page=2");
    const byPhase: BrowseSpec = { ...SPEC, sorts: ["phase", "newest"], defaultSort: "phase" };
    expect(parseState("", byPhase).sort).toBe("phase");
    expect(stateToQuery({ ...state(), sort: "phase" }, byPhase)).toBe("");
    expect(stateToQuery({ ...state(), sort: "newest" }, byPhase)).toBe("?sort=newest");
  });

  it("a filter with a starting value: absent means the start (Open), status=any means Any", () => {
    expect(initialState(Q_SPEC).extra).toEqual({ status: "open" });
    expect(parseState("", Q_SPEC).extra).toEqual({ status: "open" });
    expect(parseState("?status=answered", Q_SPEC).extra).toEqual({ status: "answered" });
    expect(parseState("?status=any", Q_SPEC).extra).toEqual({ status: ANY });
    expect(parseState("?status=maybe", Q_SPEC).extra).toEqual({ status: "open" });
    expect(stateToQuery(parseState("", Q_SPEC), Q_SPEC)).toBe("");
    expect(stateToQuery(parseState("?status=any", Q_SPEC), Q_SPEC)).toBe("?status=any");
    expect(stateToQuery(parseState("?status=answered", Q_SPEC), Q_SPEC)).toBe("?status=answered");
    // The dropdown shows "" for any; choosing "" writes status=any; choosing Open again empties the address.
    const s0 = parseState("", Q_SPEC);
    expect(extraValue(s0, STATUS_DEFAULT)).toBe("open");
    const any = withExtra(s0, STATUS_DEFAULT, "");
    expect(any.extra.status).toBe(ANY);
    expect(extraValue(any, STATUS_DEFAULT)).toBe("");
    expect(stateToQuery(any, Q_SPEC)).toBe("?status=any");
    expect(stateToQuery(withExtra(any, STATUS_DEFAULT, "open"), Q_SPEC)).toBe("");
    // Without a starting value, "" removes the key.
    expect(withExtra(state({ extra: { status: "Accepted" }, page: 3 }), SPEC.extras[0], "")).toMatchObject({ extra: {}, page: 1 });
  });

  it("Clear filters: no search, every filter on any (also a starting one), the sort stays, page 1", () => {
    const s = parseState("?q=x&tag=CPU&status=answered&sort=oldest&page=2", Q_SPEC);
    const c = clearedState(s, Q_SPEC);
    expect(c).toEqual({ ...initialState(Q_SPEC), extra: { status: ANY }, sort: "oldest" });
    expect(isFiltered(c)).toBe(false);
    expect(stateToQuery(c, Q_SPEC)).toBe("?status=any&sort=oldest");
    expect(clearedState(state({ q: "x", tags: ["CPU"] }), SPEC)).toEqual(EMPTY);
  });

  it("dates are not read or written on a tab without them", () => {
    const noDates = { ...SPEC, dates: false };
    expect(parseState("?from=2026-10-01&to=2026-10-09", noDates)).toMatchObject({ from: null, to: null });
    expect(stateToQuery(state({ from: "2026-10-01" }), noDates)).toBe("");
  });

  it("a prefix keeps two lists apart in one address (Decisions and Risks)", () => {
    const risk: BrowseSpec = { ...SPEC, prefix: "risk-", sorts: ["risk", "az"], defaultSort: "risk" };
    expect(paramKey(risk, "q")).toBe("risk-q");
    expect(paramKey(SPEC, "q")).toBe("q");
    expect(ownsKey(risk, "risk-page")).toBe(true);
    expect(ownsKey(risk, "page")).toBe(false);
    expect(ownsKey(SPEC, "page")).toBe(true);
    expect(ownsKey(SPEC, "foo")).toBe(true); // an unknown plain key is tidied by the list without a prefix
    expect(ownsKey(SPEC, "risk-page")).toBe(false);
    const both = "?q=memory&risk-q=leak&risk-sort=az&risk-page=2&page=1";
    expect(parseState(both, SPEC)).toMatchObject({ q: "memory", sort: "newest", page: 1 });
    expect(parseState(both, risk)).toMatchObject({ q: "leak", sort: "az", page: 2 });
    expect(stateToQuery(parseState(both, risk), risk)).toBe("?risk-q=leak&risk-sort=az&risk-page=2");
    expect(ownPart(both, risk)).toBe("?risk-q=leak&risk-sort=az&risk-page=2");
    expect(ownPart(both, SPEC)).toBe("?q=memory&page=1");
    // Writing one list keeps the other list's part as it is.
    expect(mergeQuery(both, "?q=tabs", SPEC)).toBe("?risk-q=leak&risk-sort=az&risk-page=2&q=tabs");
    expect(mergeQuery(both, "", risk)).toBe("?q=memory&page=1");
    expect(mergeQuery("", "", SPEC)).toBe("");
  });
});

describe("sort", () => {
  // Written order a..f over two days; some carry a time of day.
  const list: BrowseItem[] = [
    item("a", { order: 0, date: "2026-10-08", title: "Zebra", phases: ["phase-p1-foundation"], number: 3 }),
    item("b", { order: 1, date: "2026-10-08", title: "apple", phases: [], number: 1 }),
    item("c", { order: 2, date: "2026-10-10", title: "Mango", phases: ["phase-p0-planning"], number: 2 }),
    item("d", { order: 3, date: "2026-10-10", time: "09:30", title: "banana", phases: ["phase-p2-minimal-container", "phase-p0-planning"], number: null }),
    item("e", { order: 4, date: "2026-10-10", time: "21:41", title: "Cherry", phases: ["phase-p9-unknown"] }),
    item("f", { order: 5, date: "2026-10-10", time: "08:00", title: "apple", phases: ["phase-p1-foundation"] }),
  ];

  it("Newest first: newest day first; timed ones by time, then the untimed ones in reverse written order", () => {
    expect(ids(sortItems(list, "newest"))).toEqual(["e", "d", "f", "c", "b", "a"]);
  });

  it("Oldest first: the exact reverse", () => {
    expect(ids(sortItems(list, "oldest"))).toEqual(["a", "b", "c", "f", "d", "e"]);
  });

  it("same date and time keep their written order (newest first reverses it); the id breaks a full tie", () => {
    const same = [item("q2", { order: 0 }), item("q1", { order: 1 }), item("q3", { order: 2 })];
    expect(ids(sortItems(same, "oldest"))).toEqual(["q2", "q1", "q3"]);
    expect(ids(sortItems(same, "newest"))).toEqual(["q3", "q1", "q2"]);
    const timed = [item("t1", { order: 0, time: "10:00" }), item("t2", { order: 1, time: "10:00" })];
    expect(ids(sortItems(timed, "newest"))).toEqual(["t2", "t1"]);
    const tie = [item("x-10", { order: 0 }), item("x-9", { order: 0 })];
    expect(ids(sortItems(tie, "oldest"))).toEqual(["x-9", "x-10"]);
  });

  it("items without dates (Risks, Research): newest first is the written order reversed", () => {
    const noDate = [item("r1", { date: null, order: 0 }), item("r2", { date: null, order: 1 })];
    expect(ids(sortItems(noDate, "newest"))).toEqual(["r2", "r1"]);
    expect(ids(sortItems(noDate, "oldest"))).toEqual(["r1", "r2"]);
  });

  it("By phase: roadmap order by the earliest phase, unknown phases after known ones, no phase last; ties in written order", () => {
    expect(ids(sortItems(list, "phase", SPEC.phaseOrder))).toEqual(["c", "d", "a", "f", "e", "b"]);
    expect(phaseRank({ phases: [] }, SPEC.phaseOrder)).toBe(Number.POSITIVE_INFINITY);
    expect(phaseRank({ phases: ["phase-p2-minimal-container", "phase-p0-planning"] }, SPEC.phaseOrder)).toBe(0);
    expect(phaseRank({ phases: ["phase-p9-unknown"] }, SPEC.phaseOrder)).toBe(3);
  });

  it("A to Z by title: ignores case, reads numbers as numbers, the id breaks ties", () => {
    expect(ids(sortItems(list, "az"))).toEqual(["b", "f", "d", "e", "c", "a"]);
    const nums = [item("n1", { title: "Step 10" }), item("n2", { title: "Step 9" })];
    expect(ids(sortItems(nums, "az"))).toEqual(["n2", "n1"]);
  });

  it("By number: smallest first, items without a number last", () => {
    expect(ids(sortItems(list.slice(0, 4), "number"))).toEqual(["b", "c", "a", "d"]);
  });

  it("Highest risk first: likelihood × impact, highest first; ties by id as people read it", () => {
    const risks = [item("risk-r10", { score: 12 }), item("risk-r2", { score: 12 }), item("risk-r01", { score: 20 }), item("risk-r05", { score: 4 })];
    expect(ids(sortItems(risks, "risk"))).toEqual(["risk-r01", "risk-r2", "risk-r10", "risk-r05"]);
  });

  it("compareIds reads numbers inside ids as numbers", () => {
    expect(["Q-10", "Q-9", "Q-100"].sort(compareIds)).toEqual(["Q-9", "Q-10", "Q-100"]);
  });

  it("visibleItems filters, then sorts; it never changes the input", () => {
    const copy = [...list];
    expect(ids(visibleItems(list, state({ sort: "oldest", from: "2026-10-10" }), SPEC))).toEqual(["c", "f", "d", "e"]);
    expect(list).toEqual(copy);
  });

  it("every sort key has a plain label", () => {
    expect(SORTS).toEqual({
      newest: "Newest first",
      oldest: "Oldest first",
      phase: "By phase",
      az: "A to Z by title",
      number: "By number",
      risk: "Highest risk first",
    });
  });
});

describe("changes go back to page 1", () => {
  it("update resets the page unless the page itself changes", () => {
    const s = state({ page: 3 });
    expect(update(s, { q: "x" }).page).toBe(1);
    expect(update(s, { sort: "az" }).page).toBe(1);
    expect(update(s, { page: 2 }).page).toBe(2);
  });

  it("withTag adds a known tag once, in list order; withoutTag removes it", () => {
    const s = state({ tags: ["CPU"], page: 2 });
    const t = withTag(s, "tabs", SPEC);
    expect(t.tags).toEqual(["tabs", "CPU"]);
    expect(t.page).toBe(1);
    expect(withTag(t, "tabs", SPEC)).toBe(t);
    expect(withTag(t, "unknown", SPEC)).toBe(t);
    expect(withoutTag(t, "tabs")).toMatchObject({ tags: ["CPU"], page: 1 });
  });
});

describe("pages", () => {
  it("pageInfo gives the slice and keeps the page inside the range", () => {
    expect(PAGE_SIZE).toBe(20);
    expect(pageInfo(28, 1)).toEqual({ page: 1, pages: 2, start: 1, end: 20, total: 28 });
    expect(pageInfo(28, 2)).toEqual({ page: 2, pages: 2, start: 21, end: 28, total: 28 });
    expect(pageInfo(28, 9).page).toBe(2);
    expect(pageInfo(28, 0).page).toBe(1);
    expect(pageInfo(28, Number.NaN).page).toBe(1);
    expect(pageInfo(40, 2)).toMatchObject({ pages: 2, start: 21, end: 40 });
    expect(pageInfo(0, 3)).toEqual({ page: 1, pages: 1, start: 0, end: 0, total: 0 });
  });

  it("pageSlice returns the items of the page", () => {
    const list = Array.from({ length: 45 }, (_, i) => i + 1);
    expect(pageSlice(list, pageInfo(45, 3))).toEqual([41, 42, 43, 44, 45]);
    expect(pageSlice(list, pageInfo(45, 1))).toHaveLength(20);
    expect(pageSlice([], pageInfo(0, 1))).toEqual([]);
  });

  it("pageNumbers lists every page up to 7, else first, last and neighbours with gaps", () => {
    expect(pageNumbers(1, 1)).toEqual([1]);
    expect(pageNumbers(2, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(pageNumbers(1, 12)).toEqual([1, 2, 3, 4, null, 12]);
    expect(pageNumbers(6, 12)).toEqual([1, null, 5, 6, 7, null, 12]);
    expect(pageNumbers(12, 12)).toEqual([1, null, 9, 10, 11, 12]);
    // A gap of one page shows that page instead of "…".
    expect(pageNumbers(4, 9)).toEqual([1, 2, 3, 4, 5, null, 9]);
  });

  it("resultsLine says what is shown in plain words", () => {
    expect(resultsLine(pageInfo(28, 2), 28, false)).toBe("Showing 21–28 of 28");
    expect(resultsLine(pageInfo(5, 1), 28, true)).toBe("Showing 1–5 of 5 (28 in all)");
    expect(resultsLine(pageInfo(0, 1), 28, true)).toBe("No matches (28 in all)");
    expect(resultsLine(pageInfo(0, 1), 0, false)).toBe("No matches");
  });

  it("clampPage keeps the asked page inside the pages these items fill", () => {
    const many = Array.from({ length: 28 }, (_, i) => item(`i${i}`));
    expect(clampPage(state({ page: 99 }), many).page).toBe(2);
    expect(clampPage(state({ page: 2 }), many).page).toBe(2);
    const same = state({ page: 1 });
    expect(clampPage(same, many)).toBe(same);
    // Nothing matches: page 1.
    expect(clampPage(state({ q: "zzz", page: 5 }), many).page).toBe(1);
  });

  it("datesReversed is true only when both dates are set and from is after to", () => {
    expect(datesReversed(state({ from: "2026-10-10", to: "2026-10-08" }))).toBe(true);
    expect(datesReversed(state({ from: "2026-10-08", to: "2026-10-10" }))).toBe(false);
    expect(datesReversed(state({ from: "2026-10-08", to: "2026-10-08" }))).toBe(false);
    expect(datesReversed(state({ from: "2026-10-10" }))).toBe(false);
    expect(datesReversed(state({ to: "2026-10-08" }))).toBe(false);
  });
});

describe("taxonomy", () => {
  it("reads plain names and { name, explains } records alike, drops repeats; optional lists fall back", () => {
    const topics = [
      { name: "The app", explains: null },
      { name: "Plan portal", explains: "The read-only portal" },
    ];
    expect(
      normalizeTaxonomy({
        decision_categories: ["The app", { name: "Plan portal", explains: "The read-only portal" }, "The app"],
        log_categories: [{ name: "Built" }],
        tags: ["memory", { name: "CPU", explains: null }],
      }),
    ).toEqual({
      decisionCategories: topics,
      logCategories: [{ name: "Built", explains: null }],
      tags: [
        { name: "memory", explains: null },
        { name: "CPU", explains: null },
      ],
      // Not in the file: questions and risks use the decision topics, research its five kinds.
      questionCategories: topics,
      riskCategories: topics,
      researchCategories: Object.values(RESEARCH_KINDS).map((name) => ({ name, explains: null })),
    });
    expect(normalizeTaxonomy(null)).toBeNull();
  });

  it("reads the optional question, risk and research lists when the file has them", () => {
    const t = normalizeTaxonomy({
      decision_categories: ["The app"],
      log_categories: ["Built"],
      tags: ["memory", "CPU"],
      question_categories: ["Asked"],
      risk_categories: [],
      research_categories: [{ name: "Measure", explains: "One number we record." }],
    })!;
    expect(t.questionCategories.map((c) => c.name)).toEqual(["Asked"]);
    expect(t.riskCategories.map((c) => c.name)).toEqual(["The app"]); // an empty list: the fallback
    expect(t.researchCategories).toEqual([{ name: "Measure", explains: "One number we record." }]);
  });

  it("the research kinds are the owner's plain words", () => {
    expect(Object.values(RESEARCH_KINDS)).toEqual(["Research question", "Prediction", "Experiment", "Measure", "Test site"]);
  });

  it("the generated schema checks taxonomy.json: names with explanations, no empty list", () => {
    const head = { id: "taxonomy", title: "Categories and tags", summary: "The fixed lists." };
    const entry = (name: string) => ({ name, explains: `What ${name} covers.` });
    const rest = { log_categories: [entry("Built")], research_categories: [entry("Measure")], tags: [entry("memory"), entry("CPU")] };
    expect(TaxonomyFile.safeParse({ ...head, decision_categories: [entry("The app")], ...rest }).success).toBe(true);
    expect(TaxonomyFile.safeParse({ ...head, decision_categories: [], ...rest }).success).toBe(false);
    expect(TaxonomyFile.safeParse({ ...head, decision_categories: [entry("a\nb")], ...rest }).success).toBe(false);
  });

  it("labelsOf reads category, tags and phase, and tolerates missing or odd fields", () => {
    expect(labelsOf({ category: "Built", tags: ["memory", "CPU", "memory", 3, ""], phase: "phase-p0-planning" })).toEqual({
      category: "Built",
      tags: ["memory", "CPU"],
      phase: "phase-p0-planning",
    });
    expect(labelsOf({})).toEqual({ category: null, tags: [], phase: null });
    expect(labelsOf({ category: 5, tags: "memory", phase: "" })).toEqual({ category: null, tags: [], phase: null });
  });

  it("timeOf reads a valid HH:MM time and ignores anything else", () => {
    expect(timeOf({ time: "21:41" })).toBe("21:41");
    expect(timeOf({ time: "9:41" })).toBeNull();
    expect(timeOf({ time: "25:00" })).toBeNull();
    expect(timeOf({ time: 2141 })).toBeNull();
    expect(timeOf({})).toBeNull();
  });

  it("offered uses the taxonomy list, else the names in use (sorted)", () => {
    expect(offered([{ name: "B", explains: null }], ["A"])).toEqual([{ name: "B", explains: null }]);
    expect(offered(null, ["b", null, "a", "b"])).toEqual([
      { name: "a", explains: null },
      { name: "b", explains: null },
    ]);
    expect(offered([], ["z"])).toEqual([{ name: "z", explains: null }]);
  });

  it("offeredInUse keeps only the names in use, in the taxonomy's order; unknown ones come last", () => {
    const list = ["tabs", "memory", "CPU", "portal"].map((name) => ({ name, explains: `About ${name}` }));
    expect(offeredInUse(list, ["portal", null, "tabs", "portal"]).map((t) => t.name)).toEqual(["tabs", "portal"]);
    expect(offeredInUse(list, ["CPU"])[0]).toEqual({ name: "CPU", explains: "About CPU" });
    expect(offeredInUse(list, ["zebra", "memory"]).map((t) => t.name)).toEqual(["memory", "zebra"]);
    expect(offeredInUse(null, ["b", "a"]).map((t) => t.name)).toEqual(["a", "b"]);
    expect(offeredInUse(list, [])).toEqual([]);
  });
});

const SOURCE = { wiki_path: "wiki/decisions/x.md", content_hash: `sha256:${"0".repeat(64)}` };
const ROADMAP = {
  phases: [
    { id: "phase-p0-planning", short: "P0", name: "Planning" },
    { id: "phase-p1-foundation", short: "P1", name: "Foundation" },
    { id: "phase-p5-benchmark", short: "P5", name: "Benchmark" },
  ],
} as unknown as Roadmap;
const TAX = normalizeTaxonomy({
  decision_categories: ["The app", "Plan portal", "Security & privacy"],
  log_categories: ["Built", "Fixed"],
  research_categories: Object.values(RESEARCH_KINDS),
  tags: ["tabs", "memory", "CPU", "portal", "testing"],
});

function decision(n: number, over: Record<string, unknown> = {}): Decisions["items"][number] {
  return {
    id: `adr-${String(n).padStart(4, "0")}`,
    number: n,
    title: `Decision ${n}`,
    summary: `Summary of [the portal](ref:adr-0023) ${n}`,
    why: "Because it keeps memory low",
    catch: null,
    status: "Accepted",
    decided_by: "you",
    date: "2026-10-08",
    replaced_by: null,
    related: [],
    source: SOURCE,
    category: "The app",
    tags: ["memory", "tabs"],
    phase: "phase-p1-foundation",
    ...over,
  } as Decisions["items"][number];
}

function question(id: string, over: Record<string, unknown> = {}): Questions["items"][number] {
  return {
    id,
    asked: "2026-10-08",
    question: `Question ${id}?`,
    why_it_matters: "It holds up the start",
    status: "open",
    answer: null,
    answered_on: null,
    blocks: [],
    category: "The app",
    tags: ["tabs", "memory"],
    ...over,
  } as Questions["items"][number];
}

function risk(n: number, likelihood: number, impact: number, over: Record<string, unknown> = {}): Risks["items"][number] {
  return {
    id: `risk-r${String(n).padStart(2, "0")}`,
    title: `Risk ${n}`,
    summary: "Something could break",
    likelihood,
    impact,
    mitigation: "We test it early",
    phase: "phase-p1-foundation",
    status: "Open",
    related: [],
    source: SOURCE,
    category: "Security & privacy",
    tags: ["CPU", "testing"],
    ...over,
  } as Risks["items"][number];
}

describe("per-tab rules", () => {
  it("each tab has its sort choices and starting order (owner's answers of 2026-10-10)", () => {
    expect(TAB_CONFIG.log).toMatchObject({ sorts: ["newest", "oldest", "phase", "az"], defaultSort: "newest", dates: true });
    expect(TAB_CONFIG.questions).toMatchObject({ sorts: ["newest", "oldest", "phase", "az"], defaultSort: "newest", dates: true });
    expect(TAB_CONFIG.decisions).toMatchObject({ sorts: ["newest", "oldest", "phase", "az", "number"], defaultSort: "newest", dates: true });
    expect(TAB_CONFIG.risks).toMatchObject({ sorts: ["risk", "newest", "oldest", "phase", "az"], defaultSort: "risk", dates: false, prefix: "risk-" });
    expect(TAB_CONFIG.research).toMatchObject({ sorts: ["phase", "newest", "oldest", "az"], defaultSort: "phase", dates: false });
    for (const cfg of Object.values(TAB_CONFIG)) expect(cfg.sorts).toContain(cfg.defaultSort);
  });

  it("phaseOptions lists used phases in roadmap order, unknown ones last", () => {
    expect(phaseOptions(["phase-p1-foundation", null, "phase-p0-planning", "phase-p8-x", "phase-p1-foundation"], ROADMAP)).toEqual([
      { value: "phase-p0-planning", label: "P0 · Planning" },
      { value: "phase-p1-foundation", label: "P1 · Foundation" },
      { value: "phase-p8-x", label: "phase-p8-x" },
    ]);
    expect(phaseOptions(["phase-p0-planning"], null)).toEqual([{ value: "phase-p0-planning", label: "phase-p0-planning" }]);
  });

  it("decision extras: status (Rejected only when present) and who decided", () => {
    const base = decisionExtras([decision(1)]);
    expect(base.map((f) => f.key)).toEqual(["status", "by"]);
    expect(base[0].options.map((o) => o.value)).toEqual(["Accepted", "Proposed", "Replaced"]);
    expect(decisionExtras([decision(1, { status: "Rejected" })])[0].options.map((o) => o.value)).toContain("Rejected");
    expect(base[1].options).toEqual([
      { value: "you", label: "You" },
      { value: "claude", label: "Claude" },
    ]);
  });

  it("decisionsBrowse: items carry labels, number, facets and searchable text; newest first by default, By number on offer", () => {
    const decisions = {
      items: [
        decision(1),
        decision(2, { catch: "Costs CPU", decided_by: "claude", status: "Proposed", category: "Plan portal", tags: ["portal", "CPU"], date: "2026-10-09" }),
        decision(3, { date: "2026-10-08" }),
      ],
    } as unknown as Decisions;
    const b = decisionsBrowse(decisions, TAX, ROADMAP);
    expect(b.items[1]).toMatchObject({
      id: "adr-0002",
      title: "Decision 2",
      category: "Plan portal",
      tags: ["portal", "CPU"],
      phases: ["phase-p1-foundation"],
      date: "2026-10-09",
      time: null,
      order: 1,
      number: 2,
      facets: { status: ["Proposed"], by: ["claude"] },
    });
    expect(b.items[0].text).toContain("the portal"); // link markup dropped
    expect(b.items[1].text).toContain("costs cpu"); // the catch is searched
    // Only the categories and tags in use are offered.
    expect(b.spec.categories).toEqual(["The app", "Plan portal"]);
    expect(b.spec.tags).toEqual(["tabs", "memory", "CPU", "portal"]);
    expect(b.spec.phases).toEqual(["phase-p1-foundation"]);
    expect(b.spec).toMatchObject({ defaultSort: "newest", dates: true, phaseOrder: ["phase-p0-planning", "phase-p1-foundation", "phase-p5-benchmark"] });
    expect(b.sorts.map((s) => s.label)).toEqual(["Newest first", "Oldest first", "By phase", "A to Z by title", "By number"]);
    // Newest first: 9 Oct, then the two of 8 Oct in reverse written order.
    expect(ids(visibleItems(b.items, parseState("", b.spec), b.spec))).toEqual(["adr-0002", "adr-0003", "adr-0001"]);
    expect(ids(visibleItems(b.items, parseState("?sort=number", b.spec), b.spec))).toEqual(["adr-0001", "adr-0002", "adr-0003"]);
    const one = decisionsBrowse({ items: [decision(1)] } as unknown as Decisions, TAX, ROADMAP);
    expect(one.spec.tags).toEqual(["tabs", "memory"]);
    expect(parseState("?tag=CPU", one.spec).tags).toEqual([]);
    // One day only: no date range.
    expect(one.spec.dates).toBe(false);
    expect(ids(filterItems(b.items, parseState("?by=claude", b.spec)))).toEqual(["adr-0002"]);
    expect(ids(filterItems(b.items, parseState("?q=keeps+MEMORY&tag=tabs", b.spec)))).toEqual(["adr-0001", "adr-0003"]);
  });

  it("decisionsBrowse without a taxonomy offers the names in use; no file gives an empty list", () => {
    const b = decisionsBrowse({ items: [decision(1)] } as unknown as Decisions, null, null);
    expect(b.spec.categories).toEqual(["The app"]);
    expect(b.spec.tags).toEqual(["memory", "tabs"]);
    expect(decisionsBrowse(null, null, null).items).toEqual([]);
  });

  it("logBrowse: file order, time of day, has decisions / has approvals, search over title, done, next and decisions", () => {
    const entry = (id: string, over: Partial<Log["entries"][number]> & Record<string, unknown> = {}) =>
      ({
        id,
        date: "2026-10-09",
        title: `Entry ${id}`,
        done: "Built the portal",
        next: null,
        decisions: [],
        approvals: [],
        commit: null,
        covers: ["## [2026-10-09] x"],
        phase: "phase-p0-planning",
        category: "Built",
        tags: ["portal", "testing"],
        ...over,
      }) as Log["entries"][number];
    const entries = [
      entry("a", { decisions: [{ what: "Use a blocklist", by: "you" }] }),
      entry("b", { approvals: [{ what: "schema", status: "Approved" }], next: "Measure memory" }),
      entry("c", { category: "Fixed", date: "2026-10-10", time: "21:41" }),
    ];
    const b = logBrowse(entries, TAX, ROADMAP);
    expect(b.spec.extras).toBe(LOG_EXTRAS);
    expect(b.items.map((i) => i.order)).toEqual([0, 1, 2]);
    expect(b.items[2].time).toBe("21:41");
    expect(b.items.map((i) => i.facets.has)).toEqual([["decisions"], ["approvals"], []]);
    expect(ids(visibleItems(b.items, parseState("", b.spec), b.spec))).toEqual(["c", "b", "a"]);
    expect(ids(visibleItems(b.items, parseState("?sort=oldest", b.spec), b.spec))).toEqual(["a", "b", "c"]);
    expect(ids(filterItems(b.items, parseState("?has=decisions", b.spec)))).toEqual(["a"]);
    expect(ids(filterItems(b.items, parseState("?has=approvals", b.spec)))).toEqual(["b"]);
    expect(ids(filterItems(b.items, parseState("?q=blocklist", b.spec)))).toEqual(["a"]);
    expect(ids(filterItems(b.items, parseState("?q=measure", b.spec)))).toEqual(["b"]);
    expect(ids(filterItems(b.items, parseState("?category=Fixed", b.spec)))).toEqual(["c"]);
    expect(b.phases).toEqual([{ value: "phase-p0-planning", label: "P0 · Planning" }]);
  });

  it("questionsBrowse: starts on Open, newest first; Any shows all; the phase is what it holds up; the id is searched", () => {
    const q = {
      items: [
        question("Q-125", { blocks: ["phase-p1-foundation"] }),
        question("Q-221", { status: "answered", answer: "Yes", answered_on: "2026-10-09" }),
        question("Q-207", { asked: "2026-10-10", time: "09:15", blocks: ["phase-p1-foundation", "phase-p5-benchmark"], category: "Plan portal" }),
        question("Q-004", { status: "withdrawn" }),
      ],
    } as unknown as Questions;
    const b = questionsBrowse(q, TAX, ROADMAP);
    expect(b.spec.extras).toBe(QUESTION_EXTRAS);
    expect(QUESTION_EXTRAS[0]).toMatchObject({ key: "status", defaultValue: "open" });
    expect(b.spec.categories).toEqual(["The app", "Plan portal"]); // the decision topics in use
    expect(b.items[2]).toMatchObject({ phases: ["phase-p1-foundation", "phase-p5-benchmark"], date: "2026-10-10", time: "09:15" });
    const start = parseState("", b.spec);
    expect(ids(visibleItems(b.items, start, b.spec))).toEqual(["Q-207", "Q-125"]);
    expect(ids(visibleItems(b.items, parseState("?status=any", b.spec), b.spec))).toEqual(["Q-207", "Q-004", "Q-221", "Q-125"]);
    expect(ids(visibleItems(b.items, parseState("?status=answered", b.spec), b.spec))).toEqual(["Q-221"]);
    expect(ids(visibleItems(b.items, parseState("?phase=phase-p5-benchmark", b.spec), b.spec))).toEqual(["Q-207"]);
    expect(ids(filterItems(b.items, parseState("?q=q-221&status=any", b.spec)))).toEqual(["Q-221"]);
    expect(b.phases.map((p) => p.value)).toEqual(["phase-p1-foundation", "phase-p5-benchmark"]);
  });

  it("risksBrowse: score, handled-in phase, status filter in use, no dates, highest risk first with ties by id", () => {
    const risks = { items: [risk(3, 2, 2), risk(10, 4, 3, { status: "Being reduced" }), risk(2, 3, 4), risk(1, 5, 5, { phase: "phase-p5-benchmark" })] } as unknown as Risks;
    const b = risksBrowse(risks, TAX, ROADMAP);
    expect(b.items.map((i) => i.score)).toEqual([4, 12, 12, 25]);
    expect(b.spec).toMatchObject({ dates: false, defaultSort: "risk", prefix: "risk-" });
    expect(b.spec.extras[0].options.map((o) => o.value)).toEqual(["Open", "Being reduced"]);
    expect(ids(visibleItems(b.items, parseState("", b.spec), b.spec))).toEqual(["risk-r01", "risk-r02", "risk-r10", "risk-r03"]);
    expect(ids(visibleItems(b.items, parseState("?risk-status=Being+reduced", b.spec), b.spec))).toEqual(["risk-r10"]);
    expect(ids(visibleItems(b.items, parseState("?risk-phase=phase-p5-benchmark", b.spec), b.spec))).toEqual(["risk-r01"]);
    // The Decisions list's keys do not reach the risks.
    expect(parseState("?status=Open&q=nothing", b.spec)).toEqual(initialState(b.spec));
    expect(b.sorts[0]).toEqual({ value: "risk", label: "Highest risk first" });
  });

  it("researchBrowse: 5 lists become one, kind as category, phase order first", () => {
    const base = { summary: "Details", status: "Planned", related: [], source: SOURCE, tags: ["memory", "CPU"] };
    const r = {
      questions: [{ ...base, id: "rq-01", title: "Does sleeping save memory", question: "Does it?", phase: "phase-p5-benchmark", category: "Research question" }],
      hypotheses: [{ ...base, id: "hyp-01", title: "It saves a lot", prediction: "Half the memory", phase: "phase-p5-benchmark" }],
      experiments: [{ ...base, id: "exp-memory", title: "Memory test", phase: "phase-p1-foundation", status: "Designed" }],
      metrics: [{ ...base, id: "metric-ram", title: "Working set", unit: "MB" }],
      workloads: [{ ...base, id: "wl-news", title: "A news site", phase: "phase-p0-planning" }],
    } as unknown as Research;
    const rows = researchRows(r);
    expect(rows.map((x) => x.kind)).toEqual(["questions", "hypotheses", "experiments", "metrics", "workloads"]);
    expect(researchDetail(rows[0])).toBe("Does it?");
    expect(researchDetail(rows[1])).toBe("Half the memory");
    expect(researchDetail(rows[3])).toBe("Unit: MB");
    expect(researchDetail(rows[4])).toBeNull();
    const b = researchBrowse(r, TAX, ROADMAP);
    // The item's own category when it has one, else its kind.
    expect(b.items.map((i) => i.category)).toEqual(["Research question", "Prediction", "Experiment", "Measure", "Test site"]);
    expect(b.spec).toMatchObject({ dates: false, defaultSort: "phase" });
    expect(b.spec.categories).toEqual(["Research question", "Prediction", "Experiment", "Measure", "Test site"]);
    expect(b.spec.extras[0].options.map((o) => o.value)).toEqual(["Designed", "Planned"]);
    // By phase: P0, P1, then the two P5 items in written order, then the one without a phase.
    expect(ids(visibleItems(b.items, parseState("", b.spec), b.spec))).toEqual(["wl-news", "exp-memory", "rq-01", "hyp-01", "metric-ram"]);
    expect(ids(filterItems(b.items, parseState("?category=Measure", b.spec)))).toEqual(["metric-ram"]);
    expect(ids(filterItems(b.items, parseState("?q=prediction", b.spec)))).toEqual(["hyp-01"]); // the kind is searched
    expect(researchBrowse(null, null, null).items).toEqual([]);
  });

  it("researchBrowse leaves out the Status filter while each kind has its own single status (review 2026-10-11)", () => {
    const base = { summary: "Details", related: [], source: SOURCE, tags: ["memory", "CPU"] };
    const r = {
      questions: [{ ...base, id: "rq-01", title: "Q", question: "Q?", status: "Open, no data yet" }],
      hypotheses: [{ ...base, id: "hyp-01", title: "H", prediction: "P", status: "Draft, not tested" }],
      experiments: [{ ...base, id: "exp-a", title: "E", status: "Designed, not run" }],
      metrics: [{ ...base, id: "metric-a", title: "M", unit: "MB", status: "Proposed, not checked" }],
      workloads: [{ ...base, id: "wl-a", title: "W", status: "Proposed, not built" }],
    } as unknown as Research;
    expect(researchBrowse(r, TAX, ROADMAP).spec.extras).toEqual([]);
  });
});

describe("review fixes 2026-10-11", () => {
  const it_ = (id: string, category: string | null, status: string[]) => ({ id, category, facets: { status } });

  it("mirrorsCategory: true only when the filter splits the items exactly like the category", () => {
    expect(mirrorsCategory([it_("a", "X", ["1"]), it_("b", "X", ["1"]), it_("c", "Y", ["2"])], "status")).toBe(true);
    // One status in two categories, or two statuses in one category: a real extra choice.
    expect(mirrorsCategory([it_("a", "X", ["1"]), it_("b", "Y", ["1"]), it_("c", "Y", ["2"])], "status")).toBe(false);
    expect(mirrorsCategory([it_("a", "X", ["1"]), it_("b", "X", ["2"]), it_("c", "Y", ["3"])], "status")).toBe(false);
    // Fewer than two values: nothing to repeat.
    expect(mirrorsCategory([it_("a", "X", ["1"]), it_("b", "X", ["1"])], "status")).toBe(false);
    expect(mirrorsCategory([], "status")).toBe(false);
  });

  it("sortNote: only Newest or Oldest first on a list without dates", () => {
    const undated = [{ date: null }, { date: null }];
    expect(sortNote("newest", undated, "risks")).toBe("The risks have no date, so this shows the last written first.");
    expect(sortNote("oldest", undated, "risks")).toBe("The risks have no date, so this shows the first written first.");
    expect(sortNote("az", undated, "risks")).toBeNull();
    expect(sortNote("risk", undated, "risks")).toBeNull();
    expect(sortNote("newest", [{ date: "2026-10-10" }, { date: null }], "entries")).toBeNull();
    expect(sortNote("newest", [], "risks")).toBeNull();
  });
});
