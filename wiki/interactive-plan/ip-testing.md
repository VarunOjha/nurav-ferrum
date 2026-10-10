---
id: ip-testing
type: operations
title: "Plan portal: test plan and quality gates"
status: active
updated: 2026-10-09
sources:
  - raw/research/nextjs-stack.md
  - raw/01-scoping-decisions.md
  - raw/owner/2026-10-09-s01-wave0c.md
  - raw/owner/2026-10-09-s01-portal-v2-decisions.md
  - raw/evidence/phase-p0-planning/p0.17-portal-shell-checks.txt
  - raw/evidence/phase-p0-planning/p0.17-portal-views-checks.txt
  - raw/evidence/phase-p0-planning/portal-v2/portal-verify.txt
related: [ip-spec, ip-data-contract, ip-wiki-lint, ip-routes-and-views, comp-interactive-plan, adr-0023, adr-0024, adr-0025, ops-portal-pipeline, schema]
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
| `overview`, `roadmap`, `architecture`, `decisions`, `research`, `questions`, `log` | Each tab shows the real JSON as the mockups lay it out, its popups open and close with focus returning, and at 390 px nothing scrolls sideways |
| `refs` | Every id opens its explainer; Enter, Space, Esc, close button and backdrop work; related ids and Back; an id inside a phase popup opens on top |
| `scripts` | A task's script button shows the real file; the gate header shows labelled fields and opens the whole gate script; the script route serves only named scripts, only for GET |
| `security` | Spoofed `Host` gets 403 on pages and assets; the v1 approvals API is gone; no request leaves the computer; no framing; the server refuses every non-loopback address of the machine |
| `shell` | Landmarks, one `h1`, skip link, theme toggle, 404 page; at 390 px the overview and the phase popup (tasks as cards) fit |
| `a11y` | axe-core 4.14.0 (WCAG 2.1 A and AA rules) finds no violation on any tab in the light and the dark theme, nor in an open reference popup |

## 4. Visual review (Claude, after a layout change)

Full-page screenshots of every tab, the phase popup and a reference popup at 1440 and 390 pixels in the light theme,
read and compared with the owner-approved mockups; defects are fixed before the change is committed. The first review
(2026-10-09) fixed: a duplicate reference chip on the Overview, punctuation wrapping away from chips, centred long
names on architecture cards, an unfilled column under "The other groups at a glance", the phase popup's tasks table
scrolling sideways at phone width, and the gate header's hard-wrapped lines
([portal-verify.txt](../raw/evidence/phase-p0-planning/portal-v2/portal-verify.txt)).

## 5. Owner walkthrough

The owner opens the portal with `pwsh -NoProfile -File scripts/start-portal.ps1`, reads each tab and says in Claude
Code what reads wrong or unclear. This is the "Your walkthrough" row of the P0 test gate.

## 6. Evidence

Each portal step saves its check output, masked, under `wiki/raw/evidence/phase-p0-planning/`
(`p0.17-portal-shell-checks.txt`, `p0.17-portal-views-checks.txt`, `portal-v2/portal-verify.txt`), with a fingerprint line
in `wiki/raw/MANIFEST.sha256`.
