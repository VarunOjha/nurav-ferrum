"use client";
/**
 * Search, filters, results count and page numbers for a list of cards (the Decisions and Log tabs,
 * owner request 2026-10-10). The server renders every card; this component shows the ones that match,
 * 20 per page, and keeps the choice in the page address (search, filters and page), so a reload or a
 * copied link opens the same view. The address is replaced, never pushed, and the page does not jump.
 *
 * The logic lives in lib/portal/browse.ts (pure, unit-tested); this file only draws the controls.
 * On phones the filters fold under a "Filters" button; on wider screens they are always shown.
 * A filter with fewer than two choices (today the Log's phase: every entry is P0) is not drawn; it
 * appears by itself once there is a real choice. Previous and Next stay focusable at the ends
 * (aria-disabled), so a keyboard user's focus does not jump to the top of the page.
 */
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  activeCount,
  clampPage,
  datesReversed,
  filterItems,
  isFiltered,
  isIsoDate,
  pageInfo,
  pageNumbers,
  pageSlice,
  parseState,
  resultsLine,
  stateToQuery,
  update,
  withoutTag,
  withTag,
  EMPTY_STATE,
  type BrowseItem,
  type BrowseSpec,
  type BrowseState,
  type FilterOption,
} from "@/lib/portal/browse";
import type { TaxonomyTerm } from "@/lib/portal/taxonomy";
import { ui, type UiRefId } from "@/lib/portal/uiRefs";
import { useSearchParams } from "next/navigation";
import { BrowseContext, type BrowseActions } from "./BrowseContext";

/**
 * Puts the query in the page address without a new history entry and without scrolling. The history
 * state is left to Next's router (null), so its useSearchParams follows. True when the address changed.
 */
function writeAddress(query: string): boolean {
  if (window.location.search === query) return false;
  window.history.replaceState(null, "", `${window.location.pathname}${query}${window.location.hash}`);
  return true;
}

/** How many written addresses may wait for the router to catch up. */
const PENDING_MAX = 20;

/** The query of a search-params object as the address shows it ("?tag=memory"), or "". */
function queryOf(sp: URLSearchParams): string {
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export interface BrowseProps {
  /** "decisions" or "log": prefixes the control ids and test ids. */
  name: string;
  spec: BrowseSpec;
  /** Every item, in the order to show them. */
  items: BrowseItem[];
  /** The server-rendered card of each item, by item id. */
  cards: Record<string, React.ReactNode>;
  categories: TaxonomyTerm[];
  tags: TaxonomyTerm[];
  phases: FilterOption[];
  /** The phase filter's label (Decisions: "Affects phase"); "Phase" when not given. */
  phaseLabel?: string;
  /** What the search box says before anything is typed. */
  searchHint: string;
  /** "decisions" / "entries": used in the empty-state text. */
  noun: string;
  list: { as: "ul" | "div"; className: string; testId: string };
  refs: { filters: UiRefId; results: UiRefId; pages: UiRefId; extras?: Record<string, UiRefId> };
}

function DownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M6 9 L12 15 L18 9" />
    </svg>
  );
}

export default function Browse(props: BrowseProps) {
  const { name, spec, items, cards, refs } = props;
  const id = (part: string) => `${name}-${part}`;
  const params = useSearchParams();
  const spKey = queryOf(new URLSearchParams(params.toString()));
  // A page past the end (?page=99) shows the last page, and the address is tidied to say so.
  const [state, setState] = useState<BrowseState>(() => clampPage(parseState(spKey, spec), items));

  const [filtersOpen, setFiltersOpen] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const tagsRef = useRef<HTMLDetailsElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Addresses this list wrote that the router has not reported back yet (oldest first). On arrival an
  // address with unknown values is tidied up to the choice actually shown, so that one waits too.
  const [pending, setPending] = useState<string[]>(() => {
    const q = stateToQuery(state, spec);
    return q === spKey ? [] : [q];
  });

  // Every change goes through commit(): the new choice and, at once, the address that says it
  // (replaced, not pushed, so Back still leaves the tab; the page does not scroll).
  const commit = useCallback(
    (next: BrowseState) => {
      setState(next);
      const q = stateToQuery(next, spec);
      if (writeAddress(q)) setPending((p) => [...p, q].slice(-PENDING_MAX));
    },
    [spec],
  );

  const firstQuery = useRef(pending[0] ?? null);
  useEffect(() => {
    if (firstQuery.current !== null) writeAddress(firstQuery.current);
  }, []);

  // When the router reports a new address: one this list wrote is skipped (with the older ones before
  // it); any other address (a link to this tab, the tab button) starts the list again from it.
  // Checked while rendering (React's "adjust state when a prop changes" pattern).
  const [seenKey, setSeenKey] = useState(spKey);
  if (spKey !== seenKey) {
    setSeenKey(spKey);
    const i = pending.indexOf(spKey);
    if (i >= 0) {
      setPending(pending.slice(i + 1));
    } else {
      setPending([]);
      const next = clampPage(parseState(spKey, spec), items);
      if (stateToQuery(next, spec) !== stateToQuery(state, spec)) setState(next);
    }
  }

  // The tag list closes on Escape, on a click outside it and when keyboard focus leaves it.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const d = tagsRef.current;
      if (d?.open && e.target instanceof Node && !d.contains(e.target)) d.open = false;
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const matching = useMemo(() => filterItems(items, state), [items, state]);
  const info = pageInfo(matching.length, state.page);
  const shown = pageSlice(matching, info);
  const filtered = isFiltered(state);
  const on = activeCount(state);
  const reversed = datesReversed(state);

  const set = (patch: Partial<BrowseState>) => commit(update(state, patch));

  /** Brings the top of the list into view when it is above the screen (after a page or tag change). */
  const reveal = useCallback(() => {
    window.requestAnimationFrame(() => {
      const el = topRef.current;
      if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: "start" });
    });
  }, []);

  const actions = useMemo<BrowseActions>(
    () => ({
      activeTags: state.tags,
      toggleTag: (tag) => {
        commit(state.tags.includes(tag) ? withoutTag(state, tag) : withTag(state, tag, spec));
        reveal();
      },
    }),
    [state, spec, reveal, commit],
  );

  const goTo = (page: number) => {
    set({ page });
    reveal();
  };
  const clear = () => {
    commit({ ...EMPTY_STATE });
    // The button that was clicked may disappear: put the focus in the search box.
    searchRef.current?.focus();
  };

  const List = props.list.as;
  const tagSummary = state.tags.length === 0 ? "Any tag" : state.tags.length === 1 ? state.tags[0] : `${state.tags.length} tags`;

  return (
    <BrowseContext.Provider value={actions}>
      <div className="browse stack-12" ref={topRef} data-testid={`${name}-browse`}>
        <div role="search" className="browse-bar" aria-label={`Search and filter the ${props.noun}`} {...ui(refs.filters)}>
          <div className="browse-search-row">
            <label htmlFor={id("q")} className="sr-only">
              Search the {props.noun}
            </label>
            <span className="browse-search">
              <svg className="browse-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M16.5 16.5 L21 21" />
              </svg>
              <input
                id={id("q")}
                ref={searchRef}
                type="search"
                className="browse-input"
                placeholder={props.searchHint}
                value={state.q}
                maxLength={200}
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => set({ q: e.target.value })}
              />
            </span>
            <button
              type="button"
              className="browse-filters-toggle secondary-btn"
              aria-expanded={filtersOpen}
              aria-controls={id("filters")}
              onClick={() => setFiltersOpen((o) => !o)}
            >
              Filters{on > 0 ? ` (${on} on)` : ""}
              <DownIcon />
            </button>
          </div>

          <div id={id("filters")} className="browse-filters" data-open={filtersOpen ? "" : undefined}>
            <div className="browse-field">
              <label htmlFor={id("category")}>Category</label>
              <select id={id("category")} className="browse-select" value={state.category ?? ""} onChange={(e) => set({ category: e.target.value || null })}>
                <option value="">Any category</option>
                {props.categories.map((c) => (
                  <option key={c.name} value={c.name} title={c.explains ?? undefined}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="browse-field">
              <span className="browse-label" aria-hidden="true">
                Tags
              </span>
              <details
                className="browse-tags"
                ref={tagsRef}
                onKeyDown={(e) => {
                  if (e.key === "Escape" && tagsRef.current?.open) {
                    e.preventDefault();
                    e.stopPropagation();
                    tagsRef.current.open = false;
                    tagsRef.current.querySelector("summary")?.focus();
                  }
                }}
                onBlur={(e) => {
                  // Focus moved to something outside the list (Tab or Shift+Tab): close it. A null target
                  // (a click on plain text) is left to the click-outside handler above.
                  const to = e.relatedTarget;
                  const d = tagsRef.current;
                  if (d?.open && to instanceof Node && !d.contains(to)) d.open = false;
                }}
              >
                <summary className="browse-select browse-summary" data-testid={`${name}-tags-button`}>
                  <span className="sr-only">Tags: </span>
                  {tagSummary}
                </summary>
                <div className="browse-tag-list" role="group" aria-labelledby={id("tags-hint")}>
                  <p id={id("tags-hint")} className="small muted browse-tag-hint">
                    Tags: show only {props.noun} with every tag you tick
                  </p>
                  {props.tags.map((t) => (
                    <label key={t.name} className="browse-check" title={t.explains ?? undefined}>
                      <input
                        type="checkbox"
                        checked={state.tags.includes(t.name)}
                        onChange={(e) => commit(e.target.checked ? withTag(state, t.name, spec) : withoutTag(state, t.name))}
                      />
                      {t.name}
                    </label>
                  ))}
                </div>
              </details>
            </div>

            {props.phases.length > 1 && (
              <div className="browse-field">
                <label htmlFor={id("phase")}>{props.phaseLabel ?? "Phase"}</label>
                <select id={id("phase")} className="browse-select" value={state.phase ?? ""} onChange={(e) => set({ phase: e.target.value || null })}>
                  <option value="">Any phase</option>
                  {props.phases.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="browse-field">
              <label htmlFor={id("from")}>Date from</label>
              <input
                id={id("from")}
                type="date"
                className="browse-select browse-date"
                value={state.from ?? ""}
                max={state.to ?? undefined}
                onChange={(e) => set({ from: isIsoDate(e.target.value) ? e.target.value : null })}
              />
            </div>
            <div className="browse-field">
              <label htmlFor={id("to")}>Date to</label>
              <input
                id={id("to")}
                type="date"
                className="browse-select browse-date"
                value={state.to ?? ""}
                min={state.from ?? undefined}
                onChange={(e) => set({ to: isIsoDate(e.target.value) ? e.target.value : null })}
              />
            </div>

            {spec.extras.map((f) => {
              const ref = refs.extras?.[f.key];
              return (
                <div key={f.key} className="browse-field" {...(ref ? ui(ref) : {})}>
                  <label htmlFor={id(f.key)}>{f.label}</label>
                  <select
                    id={id(f.key)}
                    className="browse-select"
                    value={state.extra[f.key] ?? ""}
                    onChange={(e) => {
                      const extra = { ...state.extra };
                      if (e.target.value) extra[f.key] = e.target.value;
                      else delete extra[f.key];
                      set({ extra });
                    }}
                  >
                    <option value="">{f.anyLabel}</option>
                    {f.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>

          {state.tags.length > 0 && (
            <ul className="browse-active-tags" aria-label="Tags you filter by">
              {state.tags.map((t) => (
                <li key={t}>
                  <button type="button" className="chip chip-tag chip-remove" aria-label={`Remove tag filter ${t}`} onClick={() => commit(withoutTag(state, t))}>
                    <span aria-hidden="true">#</span>
                    {t}
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                      <path d="M6 6 L18 18 M18 6 L6 18" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="browse-results" {...ui(refs.results)}>
          <p className="small muted browse-count" aria-live="polite" aria-atomic="true" data-testid={`${name}-count`}>
            {resultsLine(info, items.length, filtered)}
          </p>
          {filtered && (
            <button type="button" className="link-btn small" onClick={clear} data-testid={`${name}-clear`}>
              Clear filters
            </button>
          )}
        </div>

        {info.total === 0 ? (
          <div className="note browse-empty" data-testid={`${name}-empty`}>
            <p className="strong">No matches</p>
            <p className="small text-2" data-testid={`${name}-empty-why`}>
              {reversed ? "The 'Date from' day is after the 'Date to' day." : `No ${props.noun} match this search and these filters.`}
            </p>
            <button type="button" className="secondary-btn" onClick={clear}>
              Clear filters
            </button>
          </div>
        ) : (
          <List className={props.list.className} data-testid={props.list.testId}>
            {shown.map((it) => (
              <Fragment key={it.id}>{cards[it.id]}</Fragment>
            ))}
          </List>
        )}

        {info.pages > 1 && (
          <div className="browse-pages-wrap" {...ui(refs.pages)}>
            <nav aria-label="Pages" className="browse-pages" data-testid={`${name}-pages`}>
              <button type="button" className="pill" aria-disabled={info.page <= 1 ? "true" : undefined} onClick={() => info.page > 1 && goTo(info.page - 1)}>
                Previous
              </button>
              <ul className="browse-page-list">
                {pageNumbers(info.page, info.pages).map((n, i) =>
                  n === null ? (
                    <li key={`gap-${i}`} className="muted" aria-hidden="true">
                      …
                    </li>
                  ) : (
                    <li key={n}>
                      <button
                        type="button"
                        className="pill browse-page"
                        aria-current={n === info.page ? "page" : undefined}
                        aria-label={`Page ${n}`}
                        onClick={() => goTo(n)}
                      >
                        {n}
                      </button>
                    </li>
                  ),
                )}
              </ul>
              <button
                type="button"
                className="pill"
                aria-disabled={info.page >= info.pages ? "true" : undefined}
                onClick={() => info.page < info.pages && goTo(info.page + 1)}
              >
                Next
              </button>
            </nav>
          </div>
        )}
      </div>
    </BrowseContext.Provider>
  );
}
