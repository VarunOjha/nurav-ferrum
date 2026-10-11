// @vitest-environment jsdom
// The browse component (components/portal/browse/Browse.tsx) on a small fixture list: 20 per page with
// numbered pages, the search box, the filters, tag chips that filter, the empty state with Clear filters,
// and the page address kept in step (replaced, never pushed). The address is read through Next's
// useSearchParams, mocked here with the jsdom location.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Browse from "@/components/portal/browse/Browse";
import LabelChips from "@/components/portal/browse/LabelChips";
import { searchText, type BrowseItem, type BrowseSpec } from "@/lib/portal/browse";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const TAGS = ["memory", "CPU", "tabs", "portal"];
const SPEC: BrowseSpec = {
  categories: ["Built", "Fixed"],
  tags: TAGS,
  phases: ["phase-p0-planning"],
  extras: [
    {
      key: "has",
      label: "Show",
      anyLabel: "All entries",
      options: [{ value: "decisions", label: "Has decisions" }],
    },
  ],
};

// 28 items: odd ones "Fixed" with tags memory+CPU, even ones "Built" with tabs+portal; one a day.
const ITEMS: BrowseItem[] = Array.from({ length: 28 }, (_, i) => {
  const n = i + 1;
  const odd = n % 2 === 1;
  return {
    id: `e${n}`,
    text: searchText(`Entry number ${n}`, odd ? "saves memory" : "draws tabs"),
    category: odd ? "Fixed" : "Built",
    tags: odd ? ["memory", "CPU"] : ["tabs", "portal"],
    phase: "phase-p0-planning",
    date: `2026-10-${String(n).padStart(2, "0")}`,
    facets: { has: n % 7 === 0 ? ["decisions"] : [] },
  };
});

const CARDS = Object.fromEntries(
  ITEMS.map((it) => [
    it.id,
    <article key={it.id} data-entry={it.id}>
      <h2>{it.id}</h2>
      <LabelChips category={it.category} tags={it.tags} uiRef="LO-10" />
    </article>,
  ]),
);

function element() {
  return (
    <Browse
      name="log"
      spec={SPEC}
      items={ITEMS}
      cards={CARDS}
      categories={SPEC.categories.map((name) => ({ name, explains: null }))}
      tags={TAGS.map((name) => ({ name, explains: null }))}
      phases={[{ value: "phase-p0-planning", label: "P0 · Planning" }]}
      searchHint="Search"
      noun="entries"
      list={{ as: "div", className: "log-list", testId: "log-list" }}
      refs={{ filters: "LO-7", results: "LO-8", pages: "LO-9", extras: { has: "LO-2" } }}
    />
  );
}
const renderBrowse = Object.assign(() => render(element()), { element });

const shownIds = () => [...document.querySelectorAll("[data-entry]")].map((e) => e.getAttribute("data-entry"));
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
  it("shows 20 per page with numbered pages; Previous and Next are disabled at the ends", () => {
    renderBrowse();
    expect(shownIds()).toHaveLength(20);
    expect(count()).toBe("Showing 1–20 of 28");
    const nav = screen.getByRole("navigation", { name: "Pages" });
    const prev = within(nav).getByRole("button", { name: "Previous" });
    const next = within(nav).getByRole("button", { name: "Next" });
    expect(prev).toHaveProperty("disabled", true);
    expect(within(nav).getByRole("button", { name: "Page 1" }).getAttribute("aria-current")).toBe("page");
    fireEvent.click(next);
    expect(shownIds()).toEqual(ITEMS.slice(20).map((i) => i.id));
    expect(count()).toBe("Showing 21–28 of 28");
    expect(within(nav).getByRole("button", { name: "Page 2" }).getAttribute("aria-current")).toBe("page");
    expect(next).toHaveProperty("disabled", true);
    expect(window.location.search).toBe("?page=2");
    fireEvent.click(within(nav).getByRole("button", { name: "Page 1" }));
    expect(window.location.search).toBe("");
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
    expect(screen.queryByRole("navigation", { name: "Pages" })).toBeNull();
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
    // The address is rewritten without the unknown values.
    expect(window.location.search).toBe("?tag=CPU&page=7");
    expect(screen.getByTestId("log-tags-button").textContent).toContain("CPU");
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

  it("outside a browse list the tag chips are plain labels", () => {
    render(<LabelChips category="Built" tags={["memory"]} uiRef="LO-10" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByTestId("label-chips").textContent).toBe("Category: BuiltTag: #memory");
    cleanup();
    const { container } = render(<LabelChips category={null} tags={[]} uiRef="LO-10" />);
    expect(container.innerHTML).toBe("");
  });
});
