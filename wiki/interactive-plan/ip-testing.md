---
id: ip-testing
type: operations
title: "Plan portal: test plan and quality gates"
status: active
updated: 2026-10-10
sources:
  - raw/research/nextjs-stack.md
  - raw/01-scoping-decisions.md
  - raw/owner/2026-10-09-s01-wave0c.md
  - raw/owner/2026-10-09-s01-portal-v2-decisions.md
  - raw/evidence/phase-p0-planning/p0.17-portal-shell-checks.txt
  - raw/evidence/phase-p0-planning/p0.17-portal-views-checks.txt
  - raw/evidence/phase-p0-planning/portal-v2/portal-verify.txt
  - raw/owner/2026-10-10-s01-ref-button.md
  - raw/evidence/phase-p0-planning/portal-v2/ref-mode-fixes-checks.txt
  - raw/owner/2026-10-10-s01-task-table-columns.md
  - raw/evidence/phase-p0-planning/portal-v2/task-columns-checks.txt
  - raw/owner/2026-10-10-s01-browser-ui-choice.md
related: [adr-0028, ip-spec, ip-data-contract, ip-wiki-lint, ip-routes-and-views, comp-interactive-plan, adr-0023, adr-0024, adr-0025, ops-portal-pipeline, schema]
approvable: true
phase: phase-p0-planning
audience: both
trigger: "Read before writing or changing tests for interactive_plan/, and before declaring any change to the portal done"
tags: [interactive-plan, testing, vitest, playwright, accessibility]
---

# Plan portal: test plan

> **This page describes the tests of portal v2** (task p0.17, 2026-10-09). The v1 test plan (approvals store,
> approve flow, wiki browser) is in git history; the v1 tests of the approvals API were removed with the API.

The owner directive is "phase-wise testing and rigorous testing" ([raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md),
directive 5). The portal shows the project's state to the owner, so the parts that could show something false get the
deepest tests: JSON shapes, approval labels, id detection, the script route and the read-only guard.

Facts used here: Vitest cannot test async Server Components, so logic lives in pure modules; browser tests run against
a production build; Next 16 removed `next lint`, so ESLint runs directly ([raw/research/nextjs-stack.md](../raw/research/nextjs-stack.md) §3.2, §3.6).

## 0. Commands (the full gate)

```bash
cd interactive_plan
npm run verify          # typecheck, eslint, unit tests, lint:wiki, build, Playwright (browser + axe) in ONE run
npm run test:coverage   # unit tests with coverage thresholds
```

`npm run verify` must exit 0 in one run before a portal change is called done. The phase P0 gate script
(`pwsh -NoProfile -File scripts/run-all-checks.ps1 -Phase P0`) runs it together with the other P0 checks.

## 1. Unit tests (Vitest, `tests/unit/`)

| File | What it proves |
|---|---|
| `portal-schemas.test.ts` | The generated zod schemas are current; zod rejects what the JSON Schemas reject, keyword by keyword; PowerShell `Test-Json` agrees on every case |
| `portal-load.test.ts` | The real `plan/portal` loads cleanly; missing or misshaped files become notes instead of crashes; view helpers |
| `portal-refs.test.tsx` | Id detection matches `pipeline.json`; every id in the real portal text renders as a working button whose explainer exists, and no text is lost; punctuation is kept on a chip's line |
| `portal-scripts.test.ts` | `GET /api/script` serves only named scripts inside `scripts/`, refuses `..`, links and big files; a script's header is split into labelled fields without losing words |
| `portal-view-tabs.test.ts` | View helpers: roadmap, log, questions and approval labels, architecture layer rows, popup ids |
| `approvals-file.test.ts`, `state.test.ts`, `hash.vectors.test.ts` | Reading `plan/approvals.json` and the approval states and fingerprints the labels rely on (shared vectors with the Python reference) |
| `security.test.ts`, `config.test.ts` | Loopback `Host` allowlist and GET/HEAD only on every route, security headers, every server script binds 127.0.0.1 on `PLAN_PORT`, configuration from environment variables |
| `mask-labels.test.ts` | Machine addresses printed by tests are always masked |
| `ui-refs.test.ts` | Ref mode's id registry: ids unique and well formed; every id used in the portal code is in the registry and every registry id is used; no id sits on an element that cannot hold the label; popup ids only in their popup; label, copy text and Layout map format; repeated items take their number and word from the registry (every stage and layer row in the plan data is registered) and never from a list position |
| `browser-mockup.test.tsx` | The picture of the chosen browser design ([adr-0028](../decisions/adr-0028-browser-look-tabs-top-ferrum-panel.md)): both palettes copied from the design; the Light / Dark switch starts on the portal's theme and changes only the picture; the whole picture is one labelled image whose summary says the values are samples, with nothing inside it focusable and every icon hidden from screen readers; the close-up of the Ferrum panel is a second labelled image with the same palettes; both carry a "Sample values" tag and the note follows the window directly; the drawing stays hidden until its width is measured, then gets the right scale |
| `portal-task-table.test.ts` | The phase popup's tasks table: the eight column headers in the owner's order ([request](../raw/owner/2026-10-10-s01-task-table-columns.md)); the thought chain splits into one step per arrow without breaking a `[words](ref:id)` link; the phase schema requires `what`, `why` and `how` and rejects empty or over-long text; a task chain must have exactly three steps, and every task in the real phase files does; the hidden words "then" and "so" stand in for the arrows |
| the other files | The command-line wiki check ([ip-wiki-lint](ip-wiki-lint.md)): loader, frontmatter, links, rules, git checks, Python parity, SCHEMA sync |

Coverage thresholds (`vitest.config.mts`): `lib/portal/**` 90 % lines and 80 % branches; `lib/approvals/**` 90/90;
`lib/wiki/**` and `lib/lint/**` 80/80.

## 2. Wiki check tests (`tests/lint/`, `npm run lint:wiki`)

The normative wiki check runs on the real wiki (0 errors required) and on fixture wikis; see [ip-wiki-lint](ip-wiki-lint.md).

## 3. Browser tests (Playwright 1.64, `tests/e2e/`)

One production server on 127.0.0.1:3418 reads the real `plan/` folder. A teardown guard fails the run if
`plan/approvals.json`, any `plan/portal` file, `wiki/log.md` or `STATUS.md` changed.

| Spec | What it proves |
|---|---|
| `overview`, `roadmap`, `architecture`, `decisions`, `research`, `questions`, `log` | Each tab shows the real JSON as the mockups lay it out, its popups open and close with focus returning, and at 390 px nothing scrolls sideways; the phase popup's tasks table has its eight column headers in order, every task row shows its what, why, how, thought-chain steps, script and check line, and state, each chain has exactly three steps with "then" and "so" for screen readers, the popup fits at 1440 px and the table needs no sideways scrolling at 1280 px; on Architecture, "How the browser will look" appears only in the Application group and before the layer diagram, the picture keeps its shape, the callouts, the canvas link and "Why we chose it" work, the Light / Dark switch works in a light and a dark portal (axe scan of each) and nothing scrolls sideways at 390 px (skipped when `browser_design` is absent) |
| `refs` | Every id opens its explainer; Enter, Space, Esc, close button and backdrop work; related ids and Back; an id inside a phase popup opens on top |
| `scripts` | A task's script button shows the real file; the gate header shows labelled fields and opens the whole gate script; the script route serves only named scripts, only for GET |
| `security` | Spoofed `Host` gets 403 on pages and assets; the v1 approvals API is gone; no request leaves the computer; no framing; the server refuses every non-loopback address of the machine |
| `shell` | Landmarks, one `h1`, skip link, theme toggle, 404 page; at 390 px the overview and the phase popup (tasks as cards with eight labelled rows, opening with one Id, State and Title line) fit |
| `a11y` | axe-core 4.14.0 (WCAG 2.1 A and AA rules) finds no violation on any tab in the light and the dark theme, nor in an open reference popup, nor in an open phase popup at 1440 and 390 px |
| `ref-mode` | The Ref button turns Ref mode on and off (click and Esc); each tab shows its expected labels and none in normal mode; the phase, script, reference and item popups show theirs; a label copies the right text (clipboard permission granted) and says "Copied"; labels are reachable with Tab only in Ref mode; the mode lasts across tabs and reloads; List all shows every id; no sideways scrolling at 390 px; axe finds nothing in Ref mode in either theme; Ref mode moves no block and keeps the top bar's height at 1440 and 390 px; at 390 px the end of every tab, of the phase popup and of the Layout map scrolls clear of the bar; the log labels the first visible entry under every filter; repeated items name their item; an old "Copied" message is cleared in a new popup; focus returns to List all and stays inside a popup after Turn off; the Layout map opens at the current group and its jump links work |

## 4. Visual review (Claude, after a layout change)

Full-page screenshots of every tab, the phase popup and a reference popup at 1440 and 390 pixels in the light theme,
read and compared with the owner-approved mockups; defects are fixed before the change is committed. The first review
(2026-10-09) fixed: a duplicate reference chip on the Overview, punctuation wrapping away from chips, centred long
names on architecture cards, an unfilled column under "The other groups at a glance", the phase popup's tasks table
scrolling sideways at phone width, and the gate header's hard-wrapped lines
([portal-verify.txt](../raw/evidence/phase-p0-planning/portal-v2/portal-verify.txt)).

The Ref mode review (2026-10-10) read screenshots with Ref mode on of every tab and the phase, script, reference and
item popups and the Layout map, at 1440 and 390 pixels in both themes, and fixed: header labels covering the header
pieces, labels covering headings and the last line of the block above, labels cut off at the top of popups, and the top
bar wrapping to two lines in normal mode once the button was added.

The browser design review (2026-10-10) read the Architecture view's Application group at 1440 and 390 pixels in both
portal themes, each with the picture switched to the other palette as well, and compared it with the design file
([browser-design-checks.txt](../raw/evidence/phase-p0-planning/portal-v2/browser-design-checks.txt)).
Its follow-up review the same day found the picture unreadable on a phone, the sample note far below it and a moment
where the drawing showed at a wrong size; the close-up of the panel, the tag, the moved note and the hidden-until-measured
drawing fixed them, and the browser tests check them at 1280 and 390 pixels
([browser-design-fixes-checks.txt](../raw/evidence/phase-p0-planning/portal-v2/browser-design-fixes-checks.txt)).
A second review the same day found that those fixes made Ref mode change the layout it names (extra space above every
block, a two-row top bar), that the bar hid the end of every page at phone width, and smaller gaps (log labels lost
under a filter, list-position numbers, item labels without a name, a Layout map without jump links, an old "Copied"
message in a new popup, lost keyboard focus); all were fixed and are now covered by the browser tests above
([ref-mode-fixes-checks.txt](../raw/evidence/phase-p0-planning/portal-v2/ref-mode-fixes-checks.txt)).

The tasks-table review (2026-10-10, after the owner asked for eight separate columns) read screenshots of the P1
phase popup's tasks table at 1440 and 390 pixels in both themes: at 1440 px all eight columns fit inside the popup with
no sideways scrolling and each thought-chain step starts on its own line; at 390 px every task is a card with eight
labelled rows. No defect was found
([task-columns-checks.txt](../raw/evidence/phase-p0-planning/portal-v2/task-columns-checks.txt)).
A second review the same day found seven points: one thought chain split into nine lines, Why cells that repeated the
Logic column, How cells that repeated the check line, sideways scrolling on 1280 px laptops, very long phone cards and
two screen-reader details. All were fixed, a schema rule now keeps every task chain at three steps, and new screenshots
at 1440, 1280 and 390 px were read
([task-columns-fixes-checks.txt](../raw/evidence/phase-p0-planning/portal-v2/task-columns-fixes-checks.txt)).

## 5. Owner walkthrough

The owner opens the portal with `pwsh -NoProfile -File scripts/start-portal.ps1`, reads each tab and says in Claude
Code what reads wrong or unclear. This is the "Your walkthrough" row of the P0 test gate.

## 6. Evidence

Each portal step saves its check output, masked, under `wiki/raw/evidence/phase-p0-planning/`
(`p0.17-portal-shell-checks.txt`, `p0.17-portal-views-checks.txt`, `portal-v2/portal-verify.txt`), with a fingerprint line
in `wiki/raw/MANIFEST.sha256`.
