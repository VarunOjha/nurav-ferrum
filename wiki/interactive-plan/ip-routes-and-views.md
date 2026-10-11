---
id: ip-routes-and-views
type: operations
title: "Plan portal: tabs, popups and UI rules"
status: active
updated: 2026-10-10
sources:
  - raw/research/nextjs-stack.md
  - raw/01-scoping-decisions.md
  - raw/owner/2026-10-09-s01-plan-app-feedback.md
  - raw/owner/2026-10-09-s01-portal-v2-decisions.md
  - raw/evidence/phase-p0-planning/p0.17-portal-views-checks.txt
  - raw/evidence/phase-p0-planning/portal-v2/portal-verify.txt
  - raw/owner/2026-10-10-s01-ref-button.md
  - raw/owner/2026-10-10-s01-task-table-columns.md
  - raw/owner/2026-10-10-s01-browser-ui-choice.md
  - raw/owner/2026-10-10-s01-decisions-log-browse.md
  - raw/owner/2026-10-10-s01-decisions-log-browse-approval.md
related: [adr-0028, ip-spec, ip-data-contract, ip-testing, comp-interactive-plan, adr-0023, adr-0024, adr-0025, adr-0026, ops-portal-pipeline, adr-0014, schema]
approvable: true
phase: phase-p0-planning
audience: both
trigger: "Read before adding or changing any tab, popup or UI component of interactive_plan/"
tags: [interactive-plan, ui, routes, accessibility, portal]
---

# Plan portal: tabs, popups and UI rules

> **This page describes portal v2** (task p0.17, 2026-10-09). The visual spec is the set of owner-approved mockups:
> Layout A of the Main board, and the Phase popup, Roadmap, Architecture and Log boards
> ([owner decisions](../raw/owner/2026-10-09-s01-portal-v2-decisions.md)). The v1 route map (wiki browser, search,
> approvals inbox, lint page, phase pages) is in git history.

Every tab is a **server component** that reads the portal JSON through `lib/portal/` ([ip-data-contract](ip-data-contract.md));
small **client components** handle only interaction (popups, theme, group switcher, log filter, Ref mode). Every route is dynamic,
so a page always shows the current files.

## 1. Route map

| Route | Tab | Shows | Data |
|---|---|---|---|
| `/` | Overview | Where we are (headline and small table; its "Questions for you" row is counted from the list of questions asked now), questions for you, what happens next in the owner's four parts (where we are, why run something, the script with a button that opens it, then tell Claude), phase progress cards, how references work, the latest three log entries | `overview.json`, `roadmap.json`, `phases/*.json`, `log.json` |
| `/roadmap` | Roadmap | The three stages (build, measure, publish), one compact row per phase (name, outcome in one line, status, tasks done), and "Same in every phase" | `roadmap.json`, `phases/*.json` |
| `/architecture` | Architecture | Four group buttons (Application, Benchmark, Testing and quality, Research and analysis, [adr-0026](../decisions/adr-0026-architecture-four-groups.md)); for the application first "How the browser will look" (`AR-9`, only when `browser_design` is present): a static picture of the chosen design ([adr-0028](../decisions/adr-0028-browser-look-tabs-top-ferrum-panel.md), option A) drawn at 1440 × 900 and scaled to the card, with a Light / Dark switch that starts on the portal's theme, one image with a summary for screen readers and nothing inside it focusable, a small "Sample values" tag in its corner and the note that every value is a sample directly under it (the drawing stays hidden until it has measured its width, so it never shows at a wrong size); on narrow screens (900 px or less) a close-up of the Ferrum panel follows, drawn at its design size 352 × 802 and scaled to the column so its words stay readable (also one labelled image with the tag); then the callouts, a link to the design canvas (new tab) and "Why we chose it", which opens the decision's explainer; then a layered diagram of the Rust app built from plain boxes, coloured by trust, with a "How to read this" side panel (colour key, purpose, one-line flow), as in the mockup; for each other group its purpose, a one-line flow and one short line per part; every box and part line opens the part popup; cards for the other groups; a footnote for planning tooling | `architecture.json` |
| `/decisions` | Decisions | Search and filters, a results line and page numbers (§6); one row per decision (number, title, one line, one plain standing: who chose it, when, and whether its written page is signed off, plus its category chip and two tag chips); replaced ones muted with a link to what replaced them; then the risks, highest likelihood × impact first (the risks table has no search or pages: the owner did not ask for it) | `decisions.json`, `taxonomy.json`, `risks.json` |
| `/research` | Research | The core question, then short sections: questions we want to answer, what we expect to find, experiments, measurements, test pages and tasks | `research.json` |
| `/questions` | Questions | Open questions first (ordered by the phase they hold up), then answered (with the owner's answer), then withdrawn | `questions.json` |
| `/log` | Log | Search and filters, a results line and page numbers (§6); entries newest first: what was done, what is next, a small table of decisions, approvals, the commit, and a category chip and two tag chips; the old All / Has decisions / Has approvals pills are now the "Show" choice among the filters | `log.json`, `taxonomy.json` |
| `/api/script?path=…` | (popup data) | The text of one check script, `text/plain`, read-only | the scripts the portal JSON names |
| anything else | 404 | "Page not found" inside the portal frame | none |

## 2. Global layout

- **Top bar:** brand, the seven tabs (current one marked with `aria-current="page"`; Questions shows the number of
  questions asked now), the badge "Read-only · steer in Claude Code", the **Ref** button (§5), and a three-state theme
  toggle (system, light, dark; the choice is kept in browser storage and applied before the first paint).
- **Data note:** a file that is missing or does not match its shape is listed at the top of every page; the rest renders.
- **Skip link** as the first focus stop; one `h1` per page.
- **Popups rendered once in the layout:** one phase popup per phase, the reference popup and the script popup, so every
  tab and every phase id can open them.

## 3. Popups

| Popup | Opened by | Shows |
|---|---|---|
| Phase | a phase card, a phase name, or "Open the whole phase" in a phase explainer | Status, tasks done, approval labels; **step order** first; tasks table with eight columns in this order: Id, Title, What (what the task does or produces), Why (why it matters), How (the approach), Logic (the thought chain, exactly three steps, one per line; a screen reader hears "then" and "so" instead of the arrows), Check script (the script button, or "Not written yet", with the plain "how we check" line under it), State (the status in words) ([owner request 2026-10-10](../raw/owner/2026-10-10-s01-task-table-columns.md)); Why says what the Logic column does not (what goes wrong without the task) and How says the method, not the proof in the check line (review 2026-10-10); the table fits a 1280 px window and scrolls sideways inside its own area ("Tasks table") only on narrower windows; test gate explained in one thought chain plus a check / proves table; the gate script's one command and its own header shown as labelled fields (without its "How to run" and "For Claude" fields); "Same in every phase" |
| Reference | any id-shaped word or `[words](ref:id)` link | Kind (or the short name the owner knows, such as "Decision 19"), title, short explainer, status, related items by title (open in the same popup, Back returns); a phase explainer offers the whole phase. Internal slugs such as `comp-…` or `layer-…` are never shown |
| Detail | a decision, risk, research item or part of the system | Short name or kind, title, status, a few labelled plain fields, related items by title; a part also shows when it is built (or, for parts that are not ours, from when we use it) and what it talks to |
| Script | a script button | The real `.ps1` text from `GET /api/script` and the command that runs it; check scripts say they print PASS, FAIL or NOT READY, other scripts (the start script) point to their own explanation |

All popups use the native `<dialog>` with `showModal()`: the page behind is inert, Esc, the close button or a backdrop
click closes the top popup only, and focus returns to the button that opened it. Popups stack (an id inside a phase
popup opens its explainer on top).

## 4. UI rules

1. **Plain words.** No bare internal ids: every id is a button with an explainer (checked by
   `pwsh tools/portal-sync-check.ps1` and by a unit test that renders all real portal text).
2. **Punctuation stays with its chip.** "(P0)" or "P8?" never breaks so that a line starts with ")" or "?".
3. **Phone width (390 px):** no sideways page scrolling on any tab; the roadmap table and the phase popup's tasks table
   turn into one card per row (a task card opens with one heading line of Id, State and Title, then What, Why and How with their name in front, and Logic and Check script with their name above); the gate header's labels move above their text.
4. **Accessibility:** landmarks, one `h1`, named controls, visible focus, toggle buttons with `aria-pressed`; axe-core
   finds no violations on any tab in either theme, nor in an open reference popup ([ip-testing](ip-testing.md)).
5. **No external requests:** fonts are self-hosted; the Content-Security-Policy allows only the portal's own origin.
6. **Read-only:** no button writes anything; approvals are labels only ([adr-0023](../decisions/adr-0023-approvals-in-claude-code-portal-read-only.md)).

7. **Ref mode changes nothing in normal mode.** With the Ref button off, no label, outline or extra spacing is shown (§5).

The final visual review (2026-10-09) compared full-page screenshots of every tab and popup at 1440 and 390 pixels in
the light theme with the mockups and fixed five defects
([portal-verify.txt](../raw/evidence/phase-p0-planning/portal-v2/portal-verify.txt)).

## 5. Ref mode (names for layout feedback)

Added 2026-10-10 at the owner's request ([raw/owner/2026-10-10-s01-ref-button.md](../raw/owner/2026-10-10-s01-ref-button.md)):
he wants to point at parts of the portal when he gives feedback on its layout.

- **The button.** "Ref" in the top bar, next to the read-only badge: a real toggle button (`aria-pressed`) described as
  "Show the names of the blocks on this page so you can refer to them in feedback". The choice is kept per viewer in
  browser storage, so it stays on while switching tabs, opening popups and reloading.
- **When on**, every layout block of the current tab, the top bar and every open popup gets a dashed outline and a small
  label "id · name" at its top-left corner, for example `OV-3 · What happens next`. The top bar's labels show only the id
  (`HD-4`); the full name is in their tooltip and accessible name. Repeated items carry their group id plus a fixed suffix
  and a short word that say which item it is, both taken from the item itself, never from its place in a list: the phase
  cards are `OV-4.0` to `OV-4.8` (the phase number, "Phase card: P1"); the four next-step parts (`OV-3.1` "Step: Where we
  are" to `OV-3.4` "Step: Then tell Claude"), the stage cards (`RM-2.1` "Stage card: Build" to `RM-2.3`) and the layer rows
  (`AR-3.1` "Layer row: What you see" to `AR-3.5` "Layer row: Windows 11") and the parts of the browser design block
  (`AR-9.1` "Light/Dark switch", `AR-9.2` "Picture of the window", `AR-9.3` "What the parts are") are listed in the registry under the item's own id
  in the plan data. Cards that all look the same (questions, log entries) are labelled once: the Decisions and Log tabs label the first
  card shown on the current page under the current search and filters.
- **A click on a label** (or Enter, since every label is a button reachable with Tab only while the mode is on) copies
  "where › id name", e.g. `Overview › OV-3 What happens next` or `Phase popup (P1) › PH-3 Tasks table`, and a polite
  live message says "Copied: …".
- **A small bar** (bottom right, one short line on a phone; inside the top popup when one is open, because a popup makes
  the page behind inert) offers **List all**, which opens the **Layout map** popup, and **Turn off**. A "Copied" message
  is cleared when the bar moves to another popup. Esc turns the mode off when no popup is open; with a popup open, Esc
  closes the popup first. Turning it off inside a popup leaves keyboard focus in that popup; closing the Layout map gives
  focus back to List all.
- **The Layout map** lists every id and name by header, tab and popup, with the numbered items under their group. It
  opens at the group of the current tab or open popup (highlighted) and has a row of jump links to every group.
- **Ref mode moves nothing** (review 2026-10-10). The outlines and labels take no space: no block, gap or the top bar
  changes place or size when the mode is switched on (a browser test checks this at 1440 and 390 px). Labels sit in the
  gap just above each block; cards hold theirs just inside their top padding; popup headers carry theirs on their bottom
  border at the right; in the small reference and script popups some labels sit at the right end, where the line above
  is empty. The only addition is room at the very end of the page and of the popups for the bar, so the bar never hides
  the last lines. Normal mode is unchanged (adding the button narrowed the top bar's gaps and the tabs' side padding
  slightly so it still fits on one line at 1440 px).

**The id registry** is `interactive_plan/lib/portal/uiRefs.ts`: one entry per block, `id → plain name`, with the prefix
saying where it lives:

| Prefix | Where | Prefix | Where |
|---|---|---|---|
| `HD` | top bar (every tab) | `LO` | Log tab |
| `OV` | Overview tab | `PH` | phase popup |
| `RM` | Roadmap tab | `IT` | item popup (a decision, risk, research item or part) |
| `AR` | Architecture tab | `RF` | reference popup |
| `DE` | Decisions tab | `SC` | script popup |
| `RE` | Research tab | `QU` | Questions tab |

Components mark a block with `{...ui("OV-3")}` (a `data-ui-ref` attribute), and one item of a group with
`{...ui("RM-2", { key: st.id })}` (looked up in the entry's `items` table) or a number of its own; ids are written by hand
and never counted from the page order, so they stay the same when the plan text changes. A new item in the plan data
takes the next free number in `items` (until then it shows its data id as the suffix, and the unit test names it). A removed block retires its number; a new block
takes the next free number of its prefix; ids are never renumbered. A marked element must be able to hold the label
button (never a list, table, row, link or button: wrap those in a `<div>`). The unit test `ui-refs.test.ts` checks the
registry and its use ([ip-testing](ip-testing.md)).

## 6. Search, filters and pages on Decisions and Log

Added 2026-10-10 at the owner's request ("Decisions and logs should be paginated, should show category and 2 tags of
relevance. Should be searchable, filterable.", [request and answers](../raw/owner/2026-10-10-s01-decisions-log-browse.md);
"Approved the plan", [approval](../raw/owner/2026-10-10-s01-decisions-log-browse-approval.md)).

- **Labels.** Every decision has one category by topic (Process & approvals, The app, Security & privacy, Research &
  benchmarks, Tools & setup, Plan portal), exactly two tags and the phase it mainly affects. Every log entry has one
  category by kind of work (Built, Checked, Decided, Fixed, Planned, Set up) and exactly two tags; its phase was already
  there. The two category lists and the 26 tags live in one file, `plan/portal/taxonomy.json`, each with a plain one-line
  explanation ([ops-portal-pipeline](../operations/ops-portal-pipeline.md)). Claude assigns the labels when it writes a
  record; the portal check refuses a label that is not on the lists. A decision's phase is the phase it mainly
  affects (where its work lands), not the phase that wrote the page, which is P0 for almost all of them.
- **Cards** show the category chip and the two tag chips. Clicking a tag chip adds that tag to the filter; clicking it
  again takes it off.
- **Search box:** not case-sensitive, accents ignored, every typed word must appear. Decisions search the title, the
  one-line meaning, the why and the catch; the log searches the title, what was done, what is next and the decisions.
- **Filters:** category, tags (several can be ticked; an item must have every ticked tag, which the tag list says in
  plain words; only the tags some item on that tab has are offered), phase (labelled "Affects phase" on Decisions),
  date from and date to (both days included; each date box stops at the other's day, and if "Date from" is after
  "Date to" the empty message says so instead of a bare "No matches"). A filter with fewer than two choices is not
  shown (today the Log's phase, since every entry is P0); it appears by itself once there is a choice. The tag list
  closes on Escape, on a click outside it and when keyboard focus leaves it. Decisions also: status (Accepted, Proposed,
  Replaced; Rejected only when one exists) and who decided (you or Claude). Log also: "Show" (all entries, has
  decisions, has approvals). On a phone the filters fold under a "Filters (n on)" button.
- **Results line** ("Showing 21–28 of 28", or "Showing 1–5 of 5 (28 in all)" while a filter is on) and **Clear
  filters**. When nothing matches: "No matches" with a Clear filters button.
- **Pages:** 20 cards per page, numbered page buttons with Previous and Next (long runs shorten to "1 … 4 5 6 … 12").
  At the first and last page, Previous or Next is marked unavailable (`aria-disabled`) but keeps keyboard focus, so
  the focus does not jump to the top of the page.
- **The address keeps the view.** Search, filters and page are written into the address (`q`, `category`, `tag`,
  `phase`, `from`, `to`, `page`, plus `status`, `by` or `has`), replaced rather than added to the history, so a reload or
  a copied link opens the same view and Back still leaves the tab. Unknown values are dropped quietly and the address is
  tidied up; any change of search or filter goes back to page 1; a page number past the end shows the last page and the address is corrected to it;
  clicking the tab button starts the list afresh.
- **Ref ids** (none renumbered): Decisions `DE-4` Search and filters, `DE-5` Results count, `DE-6` Page numbers, `DE-7`
  Category and tag chips; Log `LO-7` Search and filters, `LO-8` Results count, `LO-9` Page numbers, `LO-10` Category and
  tag chips. `LO-2` now marks the "Show" choice and is named "Decisions or approvals filter" (its count moved to `LO-8`).
- **Code:** the pure rules are in `interactive_plan/lib/portal/browse.ts` (address and choice, matching, page slices,
  results line), the per-tab items and filters in `lib/portal/browseTabs.ts`, the lists in `lib/portal/taxonomy.ts`; the
  controls are one client component, `components/portal/browse/Browse.tsx`, shared by both tabs. The server still
  renders every card; the component shows the ones that match.
