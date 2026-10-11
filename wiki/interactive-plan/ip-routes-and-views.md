---
id: ip-routes-and-views
type: operations
title: "Plan portal: tabs, popups and UI rules"
status: active
updated: 2026-10-11
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
  - raw/owner/2026-10-10-s01-browse-v2-request.md
  - raw/owner/2026-10-10-s01-browse-v2-answers-1.md
  - raw/owner/2026-10-10-s01-browse-v2-answers-2.md
  - raw/owner/2026-10-10-s01-browse-v2-answers-3.md
  - raw/owner/2026-10-10-s01-browse-v2-approval.md
  - raw/evidence/phase-p0-planning/portal-v2/lists-fixes-checks.txt
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
small **client components** handle only interaction (popups, theme, group switcher, the shared list controls, Ref mode). Every route is dynamic,
so a page always shows the current files.

## 1. Route map

| Route | Tab | Shows | Data |
|---|---|---|---|
| `/` | Overview | Where we are (headline and small table; its "Questions for you" row is counted from the list of questions asked now), questions for you, what happens next in the owner's four parts (where we are, why run something, the script with a button that opens it, then tell Claude), phase progress cards, how references work, the latest three log entries | `overview.json`, `roadmap.json`, `phases/*.json`, `log.json` |
| `/roadmap` | Roadmap | The three stages (build, measure, publish), one compact row per phase (name, outcome in one line, status, tasks done), and "Same in every phase" | `roadmap.json`, `phases/*.json` |
| `/architecture` | Architecture | Four group buttons (Application, Benchmark, Testing and quality, Research and analysis, [adr-0026](../decisions/adr-0026-architecture-four-groups.md)); for the application first "How the browser will look" (`AR-9`, only when `browser_design` is present): a static picture of the chosen design ([adr-0028](../decisions/adr-0028-browser-look-tabs-top-ferrum-panel.md), option A) drawn at 1440 × 900 and scaled to the card, with a Light / Dark switch that starts on the portal's theme, one image with a summary for screen readers and nothing inside it focusable, a small "Sample values" tag in its corner and the note that every value is a sample directly under it (the drawing stays hidden until it has measured its width, so it never shows at a wrong size); on narrow screens (900 px or less) a close-up of the Ferrum panel follows, drawn at its design size 352 × 802 and scaled to the column so its words stay readable (also one labelled image with the tag); then the callouts, a link to the design canvas (new tab) and "Why we chose it", which opens the decision's explainer; then a layered diagram of the Rust app built from plain boxes, coloured by trust, with a "How to read this" side panel (colour key, purpose, one-line flow), as in the mockup; for each other group its purpose, a one-line flow and one short line per part; every box and part line opens the part popup; cards for the other groups; a footnote for planning tooling | `architecture.json` |
| `/decisions` | Decisions | Two lists with the shared list controls (§6): the decisions (start newest first; extra sort "By number"; the closed line of a card shows the title, the date, the plain standing, the category chip and two tag chips; opened, it shows the meaning, why, the catch, who chose it and whether its written page is signed off; replaced ones muted with a link to what replaced them), then "Risks we watch" (start highest risk first; each card shows "Risk L × I = S", a category by topic, two tags, the phase that handles it; a status filter; its choices in the address start with `risk-`) | `decisions.json`, `taxonomy.json`, `risks.json` |
| `/research` | Research | The core question, kind links (each one filters the list by its kind and keeps the rest of the address; the chosen kind is marked and a second click shows every kind), then one list of all 70 research items with the shared list controls (§6): category = kind (Research question, Prediction, Experiment, Measure, Test site), starts in phase order; the status shows in the opened card, and the Status filter is left out while every kind has exactly one status (it would repeat the Kind filter); the rest of the tab stays | `research.json`, `taxonomy.json` |
| `/questions` | Questions | One list with the shared list controls (§6); the Status filter starts on Open when the address names no status, and "Any status" shows all; starts newest first (date asked, then the written order); "Asked now" chip (solid orange, unlike the outlined category chip); phase filter "Holds up phase"; category by topic; an answered question shows the owner's answer | `questions.json`, `taxonomy.json` |
| `/log` | Log | One list with the shared list controls (§6), newest first: what was done, what is next, a small table of decisions, approvals, the commit, the category chip and two tag chips; extra filter "Show" (all entries, has decisions, has approvals) | `log.json`, `taxonomy.json` |
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
| Detail | a part of the system (Architecture tab); since 2026-10-10 decisions, risks and research items show their details inside their opened card instead | Short name or kind, title, status, a few labelled plain fields, related items by title; a part also shows when it is built (or, for parts that are not ours, from when we use it) and what it talks to |
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
| `RM` | Roadmap tab | `IT` | item popup (a part of the system) |
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

## 6. One list pattern: Log, Questions, Decisions, Risks and Research

First added 2026-10-10 for Decisions and Log at the owner's request ("Decisions and logs should be paginated, should show
category and 2 tags of relevance. Should be searchable, filterable.", [request and answers](../raw/owner/2026-10-10-s01-decisions-log-browse.md);
"Approved the plan", [approval](../raw/owner/2026-10-10-s01-decisions-log-browse-approval.md)). Extended the same day to
all five lists, with cards that open on click and a Sort choice ("Make log entry cards accordian, add option to sort in
asc, desc. … similar feedback for questions too", [request](../raw/owner/2026-10-10-s01-browse-v2-request.md),
answers [1](../raw/owner/2026-10-10-s01-browse-v2-answers-1.md), [2](../raw/owner/2026-10-10-s01-browse-v2-answers-2.md),
[3](../raw/owner/2026-10-10-s01-browse-v2-answers-3.md); "Approved", [approval](../raw/owner/2026-10-10-s01-browse-v2-approval.md)).

| List | Items | Category | Starts in order | Extra sort | Extra filters | Date range |
|---|---|---|---|---|---|---|
| Log | 41 | kind of work | Newest first | – | Show (has decisions, has approvals) | yes |
| Questions | 54 | topic | Newest first | – | Status (starts on Open), "Holds up phase" | yes |
| Decisions | 28 | topic | Newest first | By number | Status, who decided | yes |
| Risks | 25 | topic | Highest risk first | Highest risk first | Status | no |
| Research | 70 | kind (Research question, Prediction, Experiment, Measure, Test site) | By phase | – | Status, only while it does not follow the kind one to one (today it does, so it is hidden) | no |

- **Labels.** Every decision, log entry, question, risk and research item has one category and exactly two tags from
  the 26 in `plan/portal/taxonomy.json`, each with a plain one-line explanation ([ops-portal-pipeline](../operations/ops-portal-pipeline.md)).
  Decisions, questions and risks share the six topics (Process & approvals, The app, Security & privacy, Research &
  benchmarks, Tools & setup, Plan portal); log entries use kinds of work (Built, Checked, Decided, Fixed, Planned, Set
  up); research items use their kind. Claude assigns the labels when it writes a record; the portal check refuses a
  label that is not on the lists. A decision's phase is the phase it mainly affects; a risk's is the phase that handles
  it; a question's is the phase or phases it holds up; a research item's is the phase on its page.
- **Cards are closed at first** (native `<details>` and `<summary>`). The closed line shows the title, the date (with
  the time of day when known), the status, the category chip and two tag chips, with no buttons inside it. Clicking it
  opens the details (every field the card showed before). Tag chips that filter sit in the opened card under the words
  "Filter by tag:" (the category is not repeated there): clicking one adds that tag to the filter, clicking again takes
  it off. On Research the closed line leaves out the status (each kind has one status today); the opened card shows it. One **Open all / Close all** button per list acts on the
  page shown. Which cards are open is not kept in the address.
- **Sort** dropdown on every list: Newest first, Oldest first, By phase (P0 to P8, items without a phase last), A to Z by
  title, plus the extras in the table. Highest risk first = likelihood × impact, ties by id. Items of the same date (and
  time) keep their written order (the order in `log.json`; for questions the order in `questions.json`); Newest first
  reverses it; the id breaks any remaining tie. Risks and research items have no date, so on those lists Newest first
  and Oldest first follow the written order, and a note under the Sort menu says so ("The risks have no date, so this
  shows the last written first").
- **Time of day** (from 2026-10-10 on): a log entry or question may carry `time` ("HH:MM", 24-hour local); the card
  shows it after the date. Older items keep the date only (SCHEMA §12).
- **Search box:** not case-sensitive, accents ignored, every typed word must appear.
- **Filters:** category, tags (several can be ticked; an item must have every ticked tag; only the categories and tags
  in use on that list are offered), phase, status, the date range where the dates differ, and the extras in the table.
  A filter with fewer than two choices is not shown. On Questions the Status filter starts on Open when the address
  names no status; "Any status" shows every question, and so does Clear filters. The tag list closes on Escape, on a
  click outside it and when keyboard focus leaves it. On a phone the filters fold under a "Filters (n on)" button.
- **Results line** ("Showing 21–28 of 28", or "Showing 1–5 of 5 (28 in all)" while a filter is on) and **Clear
  filters**. When nothing matches: "No matches" with a Clear filters button.
- **Pages:** 20 cards per page, numbered page buttons with Previous and Next (long runs shorten to "1 … 4 5 6 … 12").
  At the first and last page, Previous or Next is marked unavailable (`aria-disabled`) but keeps keyboard focus.
- **The address keeps the view.** Search, filters, sort and page are written into the address (`q`, `category`, `tag`,
  `phase`, `from`, `to`, `sort`, `page`, plus `status`, `by` or `has`; the risk list on the Decisions tab uses the same
  keys with `risk-` in front), replaced rather than added to the history, so a reload or a copied link opens the same
  view. Unknown values are dropped quietly; any change of search, filter or sort goes back to page 1; a page number past
  the end shows the last page. The Overview's "Questions for you" link ("See the open questions →") opens Questions on Open.
- **Ref ids** (none renumbered). Decisions: `DE-4` to `DE-7` (search and filters, results count, page numbers, chips),
  `DE-8` sort, `DE-9` Open all, `DE-10` card; risks `DE-11` search and filters, `DE-12` results count, `DE-13` page
  numbers, `DE-14` sort, `DE-15` Open all, `DE-16` card, `DE-17` chips; `DE-3` is now "Risks we watch" (cards).
  Research: `RE-2` is now "Kind links"; `RE-8` list, `RE-9` search and filters, `RE-10` results count, `RE-11` page
  numbers, `RE-12` sort, `RE-13` Open all, `RE-14` card, `RE-15` chips; `RE-3` to `RE-7` retired. Questions: `QU-7`
  search and filters, `QU-8` results count, `QU-9` page numbers, `QU-10` sort, `QU-11` Open all, `QU-12` chips; `QU-6`
  is now a card that opens on click; `QU-2` to `QU-5` retired. Log: `LO-7` to `LO-10` as before (`LO-10` now inside the
  opened card), `LO-11` sort, `LO-12` Open all; `LO-3` is now a card that opens on click. Every results-count block
  covers only the count and Clear filters. In Ref mode, parts inside a closed card count as not visible. Since the
  review of 2026-10-11 the chip blocks `DE-7`, `DE-17`, `RE-15`, `QU-12` and `LO-10` hold only the "Filter by tag"
  chips (renamed to say so), and `RE-2` marks the chosen kind.
- **Code:** the pure rules (address, sort, matching, page slices, results line) are in
  `interactive_plan/lib/portal/browse.ts`; the per-list rules (`TAB_CONFIG`) and item builders in
  `lib/portal/browseTabs.ts`; the label lists in `lib/portal/taxonomy.ts`; the controls are one client component,
  `components/portal/browse/Browse.tsx`, with `CardLine.tsx` (the closed line), `CardParts.tsx` and `LabelChips.tsx`
  (the "Filter by tag" chips), shared by all five lists, plus `KindLinks.tsx` (the Research kind links). The unused `LogFilter.tsx` and its two style rules were deleted (owner allowed it). The server still renders
  every card; the component shows the ones that match.
