// Search, filters and pages of the Decisions and Log tabs (owner request 2026-10-10,
// wiki/raw/owner/2026-10-10-s01-decisions-log-browse.md): the pure logic in lib/portal/browse.ts,
// the tab builders in lib/portal/browseTabs.ts and the taxonomy reader in lib/portal/taxonomy.ts.
// Uses small fixtures, not the real plan/portal files, so it does not depend on the labels being filled in.
import { describe, expect, it } from "vitest";
import {
  activeCount,
  EMPTY_STATE,
  filterItems,
  isFiltered,
  isIsoDate,
  matches,
  normalize,
  PAGE_SIZE,
  pageInfo,
  pageNumbers,
  pageSlice,
  parseState,
  resultsLine,
  searchText,
  searchWords,
  stateToQuery,
  update,
  withoutTag,
  withTag,
  type BrowseItem,
  type BrowseSpec,
  type BrowseState,
} from "@/lib/portal/browse";
import { decisionExtras, decisionsBrowse, LOG_EXTRAS, logBrowse, phaseOptions } from "@/lib/portal/browseTabs";
import type { Decisions, Log, Roadmap } from "@/lib/portal/schemas.gen";
import { TaxonomyFile } from "@/lib/portal/schemas.gen";
import { labelsOf, normalizeTaxonomy, offered } from "@/lib/portal/taxonomy";

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
};

function item(id: string, over: Partial<BrowseItem> = {}): BrowseItem {
  return { id, text: searchText(`Item ${id}`), category: "The app", tags: ["tabs", "memory"], phase: "phase-p0-planning", date: "2026-10-09", facets: { status: ["Accepted"] }, ...over };
}

const state = (over: Partial<BrowseState> = {}): BrowseState => ({ ...EMPTY_STATE, ...over });

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
    expect(matches(item("y", { facets: {} }), state({ extra: { status: "Accepted" } }))).toBe(false);
  });

  it("filterItems keeps the original order", () => {
    const list = [item("1", { category: "Plan portal" }), item("2"), item("3", { category: "Plan portal" })];
    expect(filterItems(list, state({ category: "Plan portal" })).map((i) => i.id)).toEqual(["1", "3"]);
  });

  it("isFiltered and activeCount ignore the page number", () => {
    expect(isFiltered(state({ page: 3 }))).toBe(false);
    expect(isFiltered(state({ q: "   " }))).toBe(false);
    expect(isFiltered(state({ q: "x" }))).toBe(true);
    expect(isFiltered(state({ to: "2026-10-01" }))).toBe(true);
    expect(isFiltered(state({ extra: { status: "Accepted" } }))).toBe(true);
    expect(activeCount(state({ q: "x", category: "The app", tags: ["tabs", "CPU"], phase: "p", from: "2026-01-01", to: "2026-02-01", extra: { status: "Accepted" } }))).toBe(8);
    expect(activeCount(state())).toBe(0);
  });
});

describe("address (URL query)", () => {
  it("parses every known key", () => {
    const s = parseState("?q=tab+sleep&category=The+app&tag=memory&tag=tabs&phase=phase-p1-foundation&from=2026-10-01&to=2026-10-09&status=Proposed&page=2", SPEC);
    expect(s).toEqual({
      q: "tab sleep",
      category: "The app",
      tags: ["tabs", "memory"], // in the list's order
      phase: "phase-p1-foundation",
      from: "2026-10-01",
      to: "2026-10-09",
      extra: { status: "Proposed" },
      page: 2,
    });
  });

  it("ignores unknown keys and values outside the lists", () => {
    const s = parseState("?category=Nope&tag=nope&tag=CPU&tag=CPU&phase=phase-p9-x&from=2026-02-30&to=yesterday&status=Maybe&page=0&foo=bar", SPEC);
    expect(s).toEqual({ ...EMPTY_STATE, tags: ["CPU"] });
    expect(parseState("?page=-1", SPEC).page).toBe(1);
    expect(parseState("?page=abc", SPEC).page).toBe(1);
    expect(parseState("?page=1.5", SPEC).page).toBe(1);
    expect(parseState("?page=9999999", SPEC).page).toBe(1);
    expect(parseState(new URLSearchParams("q=" + "x".repeat(300)), SPEC).q).toHaveLength(200);
  });

  it("writes a short, stable address and reads it back", () => {
    expect(stateToQuery(state(), SPEC)).toBe("");
    expect(stateToQuery(state({ page: 1, q: "  " }), SPEC)).toBe("");
    const s = state({ q: " memory  saving ", category: "The app", tags: ["tabs", "CPU"], phase: "phase-p0-planning", from: "2026-10-01", to: "2026-10-10", extra: { status: "Accepted", unknown: "x" }, page: 2 });
    const q = stateToQuery(s, SPEC);
    expect(q).toBe("?q=memory+saving&category=The+app&tag=tabs&tag=CPU&phase=phase-p0-planning&from=2026-10-01&to=2026-10-10&status=Accepted&page=2");
    expect(stateToQuery(parseState(q, SPEC), SPEC)).toBe(q);
  });
});

describe("changes go back to page 1", () => {
  it("update resets the page unless the page itself changes", () => {
    const s = state({ page: 3 });
    expect(update(s, { q: "x" }).page).toBe(1);
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
});

describe("taxonomy", () => {
  it("reads plain names and { name, explains } records alike, drops repeats", () => {
    expect(
      normalizeTaxonomy({
        decision_categories: ["The app", { name: "Plan portal", explains: "The read-only portal" }, "The app"],
        log_categories: [{ name: "Built" }],
        tags: ["memory", { name: "CPU", explains: null }],
      }),
    ).toEqual({
      decisionCategories: [
        { name: "The app", explains: null },
        { name: "Plan portal", explains: "The read-only portal" },
      ],
      logCategories: [{ name: "Built", explains: null }],
      tags: [
        { name: "memory", explains: null },
        { name: "CPU", explains: null },
      ],
    });
    expect(normalizeTaxonomy(null)).toBeNull();
  });

  it("the generated schema checks taxonomy.json: names with explanations, no empty list", () => {
    const head = { id: "taxonomy", title: "Categories and tags", summary: "The fixed lists." };
    const entry = (name: string) => ({ name, explains: `What ${name} covers.` });
    expect(TaxonomyFile.safeParse({ ...head, decision_categories: [entry("The app")], log_categories: [entry("Built")], tags: [entry("memory"), entry("CPU")] }).success).toBe(true);
    expect(TaxonomyFile.safeParse({ ...head, decision_categories: [], log_categories: [entry("Built")], tags: [entry("memory"), entry("CPU")] }).success).toBe(false);
    expect(TaxonomyFile.safeParse({ ...head, decision_categories: [entry("a\nb")], log_categories: [entry("Built")], tags: [entry("memory"), entry("CPU")] }).success).toBe(false);
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

  it("offered uses the taxonomy list, else the names in use (sorted)", () => {
    expect(offered([{ name: "B", explains: null }], ["A"])).toEqual([{ name: "B", explains: null }]);
    expect(offered(null, ["b", null, "a", "b"])).toEqual([
      { name: "a", explains: null },
      { name: "b", explains: null },
    ]);
    expect(offered([], ["z"])).toEqual([{ name: "z", explains: null }]);
  });
});

const SOURCE = { wiki_path: "wiki/decisions/x.md", content_hash: `sha256:${"0".repeat(64)}` };
const ROADMAP = {
  phases: [
    { id: "phase-p0-planning", short: "P0", name: "Planning" },
    { id: "phase-p1-foundation", short: "P1", name: "Foundation" },
  ],
} as unknown as Roadmap;

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

describe("tab builders", () => {
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

  it("decisionsBrowse: items carry labels, facets and searchable text; lists come from the taxonomy", () => {
    const decisions = { items: [decision(1), decision(2, { catch: "Costs CPU", decided_by: "claude", status: "Proposed", category: "Plan portal", tags: ["portal", "CPU"] })] } as unknown as Decisions;
    const tax = normalizeTaxonomy({ decision_categories: ["The app", "Plan portal"], log_categories: ["Built"], tags: ["tabs", "memory", "CPU", "portal"] });
    const b = decisionsBrowse(decisions, tax, ROADMAP);
    expect(b.items[1]).toMatchObject({ id: "adr-0002", category: "Plan portal", tags: ["portal", "CPU"], phase: "phase-p1-foundation", facets: { status: ["Proposed"], by: ["claude"] } });
    expect(b.items[0].text).toContain("the portal"); // link markup dropped
    expect(b.items[1].text).toContain("costs cpu"); // the catch is searched
    expect(b.spec.categories).toEqual(["The app", "Plan portal"]);
    expect(b.spec.tags).toEqual(["tabs", "memory", "CPU", "portal"]);
    expect(b.spec.phases).toEqual(["phase-p1-foundation"]);
    expect(filterItems(b.items, parseState("?by=claude", b.spec)).map((i) => i.id)).toEqual(["adr-0002"]);
    expect(filterItems(b.items, parseState("?q=keeps+MEMORY&tag=tabs", b.spec)).map((i) => i.id)).toEqual(["adr-0001"]);
  });

  it("decisionsBrowse without a taxonomy offers the names in use; no file gives an empty list", () => {
    const b = decisionsBrowse({ items: [decision(1)] } as unknown as Decisions, null, null);
    expect(b.spec.categories).toEqual(["The app"]);
    expect(b.spec.tags).toEqual(["memory", "tabs"]);
    expect(decisionsBrowse(null, null, null).items).toEqual([]);
  });

  it("logBrowse: has decisions / has approvals, search over title, done, next and decisions", () => {
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
      entry("c", { category: "Fixed" }),
    ];
    const b = logBrowse(entries, null, ROADMAP);
    expect(b.spec.extras).toBe(LOG_EXTRAS);
    expect(b.items.map((i) => i.facets.has)).toEqual([["decisions"], ["approvals"], []]);
    expect(filterItems(b.items, parseState("?has=decisions", b.spec)).map((i) => i.id)).toEqual(["a"]);
    expect(filterItems(b.items, parseState("?has=approvals", b.spec)).map((i) => i.id)).toEqual(["b"]);
    expect(filterItems(b.items, parseState("?q=blocklist", b.spec)).map((i) => i.id)).toEqual(["a"]);
    expect(filterItems(b.items, parseState("?q=measure", b.spec)).map((i) => i.id)).toEqual(["b"]);
    expect(filterItems(b.items, parseState("?category=Fixed", b.spec)).map((i) => i.id)).toEqual(["c"]);
    expect(b.phases).toEqual([{ value: "phase-p0-planning", label: "P0 · Planning" }]);
  });
});
