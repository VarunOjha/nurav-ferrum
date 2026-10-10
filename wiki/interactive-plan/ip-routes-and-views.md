---
id: ip-routes-and-views
type: operations
title: "Plan portal: tabs, popups and UI rules"
status: active
updated: 2026-10-09
sources:
  - raw/research/nextjs-stack.md
  - raw/01-scoping-decisions.md
  - raw/owner/2026-10-09-s01-plan-app-feedback.md
  - raw/owner/2026-10-09-s01-portal-v2-decisions.md
  - raw/evidence/phase-p0-planning/p0.17-portal-views-checks.txt
  - raw/evidence/phase-p0-planning/portal-v2/portal-verify.txt
related: [ip-spec, ip-data-contract, ip-testing, comp-interactive-plan, adr-0023, adr-0024, adr-0025, adr-0026, ops-portal-pipeline, adr-0014, schema]
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
small **client components** handle only interaction (popups, theme, group switcher, log filter). Every route is dynamic,
so a page always shows the current files.

## 1. Route map

| Route | Tab | Shows | Data |
|---|---|---|---|
| `/` | Overview | Where we are (headline and small table; its "Questions for you" row is counted from the list of questions asked now), questions for you, what happens next in the owner's four parts (where we are, why run something, the script with a button that opens it, then tell Claude), phase progress cards, how references work, the latest three log entries | `overview.json`, `roadmap.json`, `phases/*.json`, `log.json` |
| `/roadmap` | Roadmap | The three stages (build, measure, publish), one compact row per phase (name, outcome in one line, status, tasks done), and "Same in every phase" | `roadmap.json`, `phases/*.json` |
| `/architecture` | Architecture | Four group buttons (Application, Benchmark, Testing and quality, Research and analysis, [adr-0026](../decisions/adr-0026-architecture-four-groups.md)); for the application a layered diagram of the Rust app built from plain boxes, coloured by trust, with a "How to read this" side panel (colour key, purpose, one-line flow), as in the mockup; for each other group its purpose, a one-line flow and one short line per part; every box and part line opens the part popup; cards for the other groups; a footnote for planning tooling | `architecture.json` |
| `/decisions` | Decisions | One row per decision (number, title, one line, one plain standing: who chose it, when, and whether its written page is signed off); replaced ones muted with a link to what replaced them; then the risks, highest likelihood × impact first | `decisions.json`, `risks.json` |
| `/research` | Research | The core question, then short sections: questions we want to answer, what we expect to find, experiments, measurements, test pages and tasks | `research.json` |
| `/questions` | Questions | Open questions first (ordered by the phase they hold up), then answered (with the owner's answer), then withdrawn | `questions.json` |
| `/log` | Log | Entries newest first: what was done, what is next, a small table of decisions, approvals, and the commit; filter All / Has decisions / Has approvals | `log.json` |
| `/api/script?path=…` | (popup data) | The text of one check script, `text/plain`, read-only | the scripts the portal JSON names |
| anything else | 404 | "Page not found" inside the portal frame | none |

## 2. Global layout

- **Top bar:** brand, the seven tabs (current one marked with `aria-current="page"`; Questions shows the number of
  questions asked now), the badge "Read-only · steer in Claude Code", and a three-state theme toggle (system, light,
  dark; the choice is kept in browser storage and applied before the first paint).
- **Data note:** a file that is missing or does not match its shape is listed at the top of every page; the rest renders.
- **Skip link** as the first focus stop; one `h1` per page.
- **Popups rendered once in the layout:** one phase popup per phase, the reference popup and the script popup, so every
  tab and every phase id can open them.

## 3. Popups

| Popup | Opened by | Shows |
|---|---|---|
| Phase | a phase card, a phase name, or "Open the whole phase" in a phase explainer | Status, tasks done, approval labels; **step order** first; tasks table (id and state, title, what and why as a thought chain, how we check, check script button); test gate explained in one thought chain plus a check / proves table; the gate script's one command and its own header shown as labelled fields (without its "How to run" and "For Claude" fields); "Same in every phase" |
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
   turn into one card per row; the gate header's labels move above their text.
4. **Accessibility:** landmarks, one `h1`, named controls, visible focus, toggle buttons with `aria-pressed`; axe-core
   finds no violations on any tab in either theme, nor in an open reference popup ([ip-testing](ip-testing.md)).
5. **No external requests:** fonts are self-hosted; the Content-Security-Policy allows only the portal's own origin.
6. **Read-only:** no button writes anything; approvals are labels only ([adr-0023](../decisions/adr-0023-approvals-in-claude-code-portal-read-only.md)).

The final visual review (2026-10-09) compared full-page screenshots of every tab and popup at 1440 and 390 pixels in
the light theme with the mockups and fixed five defects
([portal-verify.txt](../raw/evidence/phase-p0-planning/portal-v2/portal-verify.txt)).
