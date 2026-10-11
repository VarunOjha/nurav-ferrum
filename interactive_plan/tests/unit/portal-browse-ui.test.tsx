// @vitest-environment jsdom
// The browse component (components/portal/browse/Browse.tsx) on a small fixture list: 20 per page with
// numbered pages, the search box, the filters, the Sort dropdown, cards that open on click with
// "Open all / Close all", tag chips that filter, the empty state with Clear filters, a filter that
// starts on a value (the Questions tab's Status on Open), and the page address kept in step (replaced,
// never pushed). The address is read through Next's useSearchParams, mocked here with the jsdom location.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Browse, { type BrowseCard } from "@/components/portal/browse/Browse";
import CardLine from "@/components/portal/browse/CardLine";
import LabelChips from "@/components/portal/browse/LabelChips";
import { searchText, type BrowseItem, type BrowseSpec, type ExtraFilter } from "@/lib/portal/browse";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const TAGS = ["memory", "CPU", "tabs", "portal"];
const PHASES = [
  { value: "phase-p0-planning", label: "P0 · Planning" },
  { value: "phase-p1-foundation", label: "P1 · Foundation" },
];
const SORTS = [
  { value: "oldest", label: "Oldest first" },
  { value: "newest", label: "Newest first" },
  { value: "az", label: "A to Z by title" },
];
// This fixture starts oldest first, so page 1 holds e1..e20 (the real Log starts newest first).
const SPEC: BrowseSpec = {
  categories: ["Built", "Fixed"],
  tags: TAGS,
  phases: PHASES.map((p) => p.value),
  extras: [
    {
      key: "has",
      label: "Show",
      anyLabel: "All entries",
      options: [
        { value: "decisions", label: "Has decisions" },
        { value: "approvals", label: "Has approvals" },
      ],
    },
  ],
  sorts: ["oldest", "newest", "az"],
  defaultSort: "oldest",
  dates: true,
  phaseOrder: PHASES.map((p) => p.value),
};

// 28 items: odd ones "Fixed" with tags memory+CPU, even ones "Built" with tabs+portal; one a day.
const ITEMS: BrowseItem[] = Array.from({ length: 28 }, (_, i) => {
  const n = i + 1;
  const odd = n % 2 === 1;
  return {
    id: `e${n}`,
    text: searchText(`Entry number ${n}`, odd ? "saves memory" : "draws tabs"),
    title: `Entry number ${n}`,
    category: odd ? "Fixed" : "Built",
    tags: odd ? ["memory", "CPU"] : ["tabs", "portal"],
    phases: ["phase-p0-planning"],
    date: `2026-10-${String(n).padStart(2, "0")}`,
    time: n === 28 ? "21:41" : null,
    order: i,
    facets: { has: n % 7 === 0 ? ["decisions"] : [] },
  };
});

const CARDS: Record<string, BrowseCard> = Object.fromEntries(
  ITEMS.map((it) => [
    it.id,
    {
      attrs: { className: "log-entry", "data-entry": it.id },
      summary: <CardLine title={it.title} level={2} when={it.date} category={it.category} tags={it.tags} />,
      body: (
        <div>
          <p>Details of {it.id}</p>
          <LabelChips category={it.category} tags={it.tags} uiRef="LO-10" />
        </div>
      ),
    },
  ]),
);

function element(over: { phases?: typeof PHASES; phaseLabel?: string; spec?: BrowseSpec; sorts?: typeof SORTS } = {}) {
  const spec = over.spec ?? SPEC;
  return (
    <Browse
      name="log"
      spec={spec}
      items={ITEMS}
      cards={CARDS}
      categories={spec.categories.map((name) => ({ name, explains: null }))}
      tags={TAGS.map((name) => ({ name, explains: null }))}
      phases={over.phases ?? PHASES}
      sorts={over.sorts ?? SORTS}
      phaseLabel={over.phaseLabel}
      searchHint="Search"
      noun="entries"
      listTestId="log-list"
      cardRef="LO-3"
      refs={{ filters: "LO-7", results: "LO-8", pages: "LO-9", sort: "LO-11", openAll: "LO-12", extras: { has: "LO-2" } }}
    />
  );
}
const renderBrowse = Object.assign((over: Parameters<typeof element>[0] = {}) => render(element(over)), { element });

const shownIds = () => [...document.querySelectorAll("[data-entry]")].map((e) => e.getAttribute("data-entry"));
const detailsOf = (id: string) => document.querySelector(`[data-entry="${id}"] details`) as HTMLDetailsElement;
const count = () => screen.getByTestId("log-count").textContent;

beforeEach(() => {
  window.history.replaceState(null, "", "/log");
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    cb(0);
    return 0;
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Browse", () => {
  it("shows 20 per page with numbered pages; Previous and Next are marked unavailable at the ends", () => {
    renderBrowse();
    expect(shownIds()).toHaveLength(20);
    expect(count()).toBe("Showing 1–20 of 28");
    const nav = screen.getByRole("navigation", { name: "Pages of the entries" });
    const prev = within(nav).getByRole("button", { name: "Previous" });
    const next = within(nav).getByRole("button", { name: "Next" });
    expect(prev.getAttribute("aria-disabled")).toBe("true");
    expect(prev).toHaveProperty("disabled", false);
    // Pressing it at the first page does nothing.
    fireEvent.click(prev);
    expect(count()).toBe("Showing 1–20 of 28");
    expect(within(nav).getByRole("button", { name: "Page 1" }).getAttribute("aria-current")).toBe("page");
    fireEvent.click(next);
    expect(shownIds()).toEqual(ITEMS.slice(20).map((i) => i.id));
    expect(count()).toBe("Showing 21–28 of 28");
    expect(within(nav).getByRole("button", { name: "Page 2" }).getAttribute("aria-current")).toBe("page");
    expect(next.getAttribute("aria-disabled")).toBe("true");
    expect(window.location.search).toBe("?page=2");
    fireEvent.click(within(nav).getByRole("button", { name: "Page 1" }));
    expect(window.location.search).toBe("");
  });

  it("keyboard focus stays on Previous when it takes you to the first page", () => {
    window.history.replaceState(null, "", "/log?page=2");
    renderBrowse();
    const prev = within(screen.getByRole("navigation", { name: "Pages of the entries" })).getByRole("button", { name: "Previous" });
    prev.focus();
    fireEvent.click(prev);
    expect(count()).toBe("Showing 1–20 of 28");
    expect(prev.getAttribute("aria-disabled")).toBe("true");
    expect(document.activeElement).toBe(prev);
  });

  it("search: every word must appear; the page goes back to 1; the address keeps it", () => {
    window.history.replaceState(null, "", "/log?page=2");
    renderBrowse();
    expect(count()).toBe("Showing 21–28 of 28");
    fireEvent.change(screen.getByLabelText("Search the entries"), { target: { value: "MEMORY number 1" } });
    // Odd entries whose text has "1": 1, 11, 13, 15, 17, 19, 21.
    expect(shownIds()).toEqual(["e1", "e11", "e13", "e15", "e17", "e19", "e21"]);
    expect(count()).toBe("Showing 1–7 of 7 (28 in all)");
    expect(window.location.search).toBe("?q=MEMORY+number+1");
    expect(screen.queryByRole("navigation", { name: "Pages of the entries" })).toBeNull();
  });

  it("category, phase, dates and the tab's own filter narrow the list", () => {
    renderBrowse();
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "Built" } });
    expect(shownIds()).toHaveLength(14);
    fireEvent.change(screen.getByLabelText("Date from"), { target: { value: "2026-10-10" } });
    fireEvent.change(screen.getByLabelText("Date to"), { target: { value: "2026-10-14" } });
    expect(shownIds()).toEqual(["e10", "e12", "e14"]);
    fireEvent.change(screen.getByLabelText("Show"), { target: { value: "decisions" } });
    expect(shownIds()).toEqual(["e14"]);
    fireEvent.change(screen.getByLabelText("Phase"), { target: { value: "phase-p0-planning" } });
    expect(window.location.search).toBe("?category=Built&phase=phase-p0-planning&from=2026-10-10&to=2026-10-14&has=decisions");
    fireEvent.change(screen.getByLabelText("Show"), { target: { value: "" } });
    expect(shownIds()).toEqual(["e10", "e12", "e14"]);
  });

  it("the tag list filters by every ticked tag", () => {
    renderBrowse();
    const group = screen.getByRole("group", { name: /every tag you tick/ });
    fireEvent.click(within(group).getByLabelText("memory"));
    expect(shownIds()).toHaveLength(14);
    fireEvent.click(within(group).getByLabelText("tabs"));
    expect(count()).toBe("No matches (28 in all)");
    fireEvent.click(within(group).getByLabelText("tabs"));
    expect(shownIds()).toHaveLength(14);
  });

  it("a tag chip turns its filter on (and off); the chosen tag shows as a removable chip", () => {
    renderBrowse();
    const chip = within(document.querySelector('[data-entry="e2"]') as HTMLElement).getByRole("button", { name: "Filter by tag portal" });
    expect(chip.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(chip);
    expect(shownIds()).toHaveLength(14);
    expect(window.location.search).toBe("?tag=portal");
    const again = within(document.querySelector('[data-entry="e2"]') as HTMLElement).getByRole("button", { name: "Filter by tag portal" });
    expect(again.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Remove tag filter portal" }));
    expect(shownIds()).toHaveLength(20);
  });

  it("no matches: a plain empty state whose button clears everything and focuses the search box", () => {
    renderBrowse();
    fireEvent.change(screen.getByLabelText("Search the entries"), { target: { value: "nothing-like-this" } });
    const empty = screen.getByTestId("log-empty");
    expect(empty.textContent).toContain("No matches");
    fireEvent.click(within(empty).getByRole("button", { name: "Clear filters" }));
    expect(shownIds()).toHaveLength(20);
    expect(document.activeElement).toBe(screen.getByLabelText("Search the entries"));
    expect(screen.queryByTestId("log-clear")).toBeNull();
  });

  it("restores the view from the address and drops what it does not know", () => {
    window.history.replaceState(null, "", "/log?tag=CPU&tag=bogus&category=Nope&from=2026-99-01&page=7");
    renderBrowse();
    expect(count()).toBe("Showing 1–14 of 14 (28 in all)");
    // The address is rewritten without the unknown values, and page 7 of 1 becomes page 1.
    expect(window.location.search).toBe("?tag=CPU");
    expect(screen.getByTestId("log-tags-button").textContent).toContain("CPU");
  });

  it("a page past the end shows the last page and the address says so", () => {
    window.history.replaceState(null, "", "/log?page=99");
    renderBrowse();
    expect(count()).toBe("Showing 21–28 of 28");
    expect(window.location.search).toBe("?page=2");
  });

  it("a 'Date from' after the 'Date to' says why nothing matches; the date boxes limit each other", () => {
    renderBrowse();
    fireEvent.change(screen.getByLabelText("Date from"), { target: { value: "2026-10-10" } });
    expect(screen.getByLabelText("Date to").getAttribute("min")).toBe("2026-10-10");
    fireEvent.change(screen.getByLabelText("Date to"), { target: { value: "2026-10-08" } });
    expect(screen.getByLabelText("Date from").getAttribute("max")).toBe("2026-10-08");
    expect(count()).toBe("No matches (28 in all)");
    expect(screen.getByTestId("log-empty-why").textContent).toBe("The 'Date from' day is after the 'Date to' day.");
    fireEvent.change(screen.getByLabelText("Date to"), { target: { value: "2026-10-12" } });
    expect(shownIds()).toEqual(["e10", "e11", "e12"]);
  });

  it("the phase filter is hidden while there is only one phase, and can have its own label", () => {
    renderBrowse({ phases: [PHASES[0]] });
    expect(screen.queryByLabelText("Phase")).toBeNull();
    cleanup();
    renderBrowse({ phaseLabel: "Affects phase" });
    expect(screen.getByLabelText("Affects phase")).toBeTruthy();
  });

  it("the tag list closes when keyboard focus moves out of it, not when it moves inside", () => {
    renderBrowse();
    const details = screen.getByTestId("log-tags-button").closest("details")!;
    details.open = true;
    const boxes = within(details).getAllByRole("checkbox");
    fireEvent.blur(boxes[0], { relatedTarget: boxes[1] });
    expect(details.open).toBe(true);
    fireEvent.blur(boxes[0], { relatedTarget: null });
    expect(details.open).toBe(true);
    fireEvent.blur(boxes[1], { relatedTarget: screen.getByLabelText("Date from") });
    expect(details.open).toBe(false);
  });

  it("a new address from outside (a link to the tab) starts again from it", () => {
    const { rerender } = renderBrowse();
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "Fixed" } });
    expect(shownIds()).toHaveLength(14);
    // A link to the tab with a tag: the address changes without this list writing it.
    act(() => {
      window.history.replaceState(null, "", "/log?tag=tabs");
    });
    rerender(renderBrowse.element());
    expect(screen.getByLabelText("Category")).toHaveProperty("value", "");
    expect(count()).toBe("Showing 1–14 of 14 (28 in all)");
    expect(window.location.search).toBe("?tag=tabs");
  });

  it("the Filters button says how many filters are on and opens the filters", () => {
    renderBrowse();
    const btn = screen.getByRole("button", { name: /^Filters/ });
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    expect(document.getElementById("log-filters")!.hasAttribute("data-open")).toBe(true);
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "Fixed" } });
    expect(btn.textContent).toContain("(1 on)");
  });

  it("the Sort dropdown reorders the list, goes back to page 1 and keeps its choice in the address", () => {
    window.history.replaceState(null, "", "/log?page=2");
    renderBrowse();
    const sort = screen.getByLabelText("Sort") as HTMLSelectElement;
    expect(sort.value).toBe("oldest");
    expect([...sort.options].map((o) => o.textContent)).toEqual(["Oldest first", "Newest first", "A to Z by title"]);
    fireEvent.change(sort, { target: { value: "newest" } });
    expect(shownIds().slice(0, 3)).toEqual(["e28", "e27", "e26"]);
    expect(count()).toBe("Showing 1–20 of 28");
    expect(window.location.search).toBe("?sort=newest");
    fireEvent.change(sort, { target: { value: "az" } });
    // "Entry number 1", "Entry number 2", ... read as numbers.
    expect(shownIds().slice(0, 3)).toEqual(["e1", "e2", "e3"]);
    fireEvent.change(sort, { target: { value: "oldest" } });
    expect(window.location.search).toBe("");
  });

  it("an address with a sort restores it; one the tab does not offer is ignored", () => {
    window.history.replaceState(null, "", "/log?sort=newest");
    renderBrowse();
    expect((screen.getByLabelText("Sort") as HTMLSelectElement).value).toBe("newest");
    expect(shownIds()[0]).toBe("e28");
    cleanup();
    window.history.replaceState(null, "", "/log?sort=risk");
    renderBrowse();
    expect((screen.getByLabelText("Sort") as HTMLSelectElement).value).toBe("oldest");
    expect(window.location.search).toBe("");
  });

  it("cards start closed; the closed line has the title, date, category and tags but no button", () => {
    renderBrowse();
    const d = detailsOf("e1");
    expect(d.open).toBe(false);
    const summary = d.querySelector("summary")!;
    expect(summary.querySelector("h2")!.textContent).toBe("Entry number 1");
    expect(summary.textContent).toContain("2026-10-01");
    expect(summary.querySelector(".chip-cat")!.textContent).toBe("Category: Fixed");
    expect(summary.querySelectorAll(".chip-tag")).toHaveLength(2);
    expect(summary.querySelectorAll("button, a, input, select")).toHaveLength(0);
    // The tag chips that filter are in the details.
    expect(d.querySelectorAll(".acc-body button.chip-tag")).toHaveLength(2);
    // Every card is marked for Ref mode with the card id; the list item carries the card's own attributes.
    const li = document.querySelector('[data-entry="e1"]')!;
    expect(li.tagName).toBe("LI");
    expect(li.getAttribute("data-ui-ref")).toBe("LO-3");
    expect(li.className).toBe("acc-card log-entry");
  });

  it("a card opens and closes on its own; Open all opens the page shown, then says Close all", () => {
    renderBrowse();
    const btn = screen.getByTestId("log-open-all");
    expect(btn.textContent).toBe("Open all");
    expect(btn.getAttribute("aria-controls")).toBe("log-list");
    // One card opened by the reader (the toggle event tells the list).
    const d = detailsOf("e3");
    d.open = true;
    fireEvent(d, new Event("toggle"));
    expect(detailsOf("e3").open).toBe(true);
    expect(btn.textContent).toBe("Open all");
    fireEvent.click(btn);
    expect(shownIds().every((id) => detailsOf(id!).open)).toBe(true);
    expect(btn.textContent).toBe("Close all");
    // Which cards are open is not kept in the address.
    expect(window.location.search).toBe("");
    // Page 2: its cards are closed, so the button offers Open all again; it acts on this page only.
    fireEvent.click(within(screen.getByRole("navigation", { name: /Pages/ })).getByRole("button", { name: "Page 2" }));
    expect(shownIds().every((id) => !detailsOf(id!).open)).toBe(true);
    expect(screen.getByTestId("log-open-all").textContent).toBe("Open all");
    fireEvent.click(screen.getByTestId("log-open-all"));
    expect(shownIds().every((id) => detailsOf(id!).open)).toBe(true);
    fireEvent.click(screen.getByTestId("log-open-all"));
    expect(shownIds().every((id) => !detailsOf(id!).open)).toBe(true);
    // Back on page 1 the cards opened there are still open.
    fireEvent.click(within(screen.getByRole("navigation", { name: /Pages/ })).getByRole("button", { name: "Page 1" }));
    expect(detailsOf("e1").open).toBe(true);
    expect(screen.getByTestId("log-open-all").textContent).toBe("Close all");
    // A reader closing one card makes the button offer Open all again.
    const one = detailsOf("e1");
    one.open = false;
    fireEvent(one, new Event("toggle"));
    expect(screen.getByTestId("log-open-all").textContent).toBe("Open all");
  });

  it("no matches: no Open all button", () => {
    renderBrowse();
    fireEvent.change(screen.getByLabelText("Search the entries"), { target: { value: "nothing-like-this" } });
    expect(screen.queryByTestId("log-open-all")).toBeNull();
  });

  it("a filter that starts on a value: on at first, Any writes status=any, Clear filters shows all", () => {
    const status: ExtraFilter = {
      key: "has",
      label: "Status",
      anyLabel: "Any status",
      defaultValue: "decisions",
      options: [
        { value: "decisions", label: "Open" },
        { value: "none", label: "Answered" },
      ],
    };
    renderBrowse({ spec: { ...SPEC, extras: [status] } });
    const select = screen.getByLabelText("Status") as HTMLSelectElement;
    expect(select.value).toBe("decisions");
    expect(count()).toBe("Showing 1–4 of 4 (28 in all)");
    expect(window.location.search).toBe("");
    expect(screen.getByRole("button", { name: /^Filters/ }).textContent).toContain("(1 on)");
    fireEvent.change(select, { target: { value: "" } });
    expect(count()).toBe("Showing 1–20 of 28");
    expect(window.location.search).toBe("?has=any");
    fireEvent.change(select, { target: { value: "decisions" } });
    expect(window.location.search).toBe("");
    fireEvent.click(screen.getByTestId("log-clear"));
    expect(count()).toBe("Showing 1–20 of 28");
    expect(window.location.search).toBe("?has=any");
    expect(select.value).toBe("");
  });

  it("a filter with fewer than two choices is not drawn", () => {
    const spec: BrowseSpec = { ...SPEC, categories: ["Built"], extras: [{ ...SPEC.extras[0], options: [SPEC.extras[0].options[0]] }] };
    render(
      <Browse
        name="log"
        spec={spec}
        items={ITEMS}
        cards={CARDS}
        categories={[{ name: "Built", explains: null }]}
        tags={[{ name: "memory", explains: null }]}
        phases={[PHASES[0]]}
        sorts={[SORTS[0]]}
        searchHint="Search"
        noun="entries"
        listTestId="log-list"
        cardRef="LO-3"
        refs={{ filters: "LO-7", results: "LO-8", pages: "LO-9", sort: "LO-11", openAll: "LO-12" }}
      />,
    );
    expect(screen.queryByLabelText("Category")).toBeNull();
    expect(screen.queryByTestId("log-tags-button")).toBeNull();
    expect(screen.queryByLabelText("Phase")).toBeNull();
    expect(screen.queryByLabelText("Show")).toBeNull();
    expect(screen.queryByLabelText("Sort")).toBeNull();
    // The dates still differ, so the date range stays.
    expect(screen.getByLabelText("Date from")).toBeTruthy();
  });

  it("a tab without dates draws no date range", () => {
    renderBrowse({ spec: { ...SPEC, dates: false } });
    expect(screen.queryByLabelText("Date from")).toBeNull();
    expect(screen.queryByLabelText("Date to")).toBeNull();
  });

  it("two lists on one tab keep their own part of the address", () => {
    window.history.replaceState(null, "", "/decisions?risk-sort=az&risk-page=2");
    renderBrowse();
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "Fixed" } });
    expect(window.location.search).toBe("?risk-sort=az&risk-page=2&category=Fixed");
    fireEvent.click(screen.getByTestId("log-clear"));
    expect(window.location.search).toBe("?risk-sort=az&risk-page=2");
  });

  it("outside a browse list the tag chips are plain labels", () => {
    render(<LabelChips category="Built" tags={["memory"]} uiRef="LO-10" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByTestId("label-chips").textContent).toBe("Category: BuiltTag: #memory");
    cleanup();
    const { container } = render(<LabelChips category={null} tags={[]} uiRef="LO-10" />);
    expect(container.innerHTML).toBe("");
  });
});
