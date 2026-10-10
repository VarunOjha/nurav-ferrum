# Ferrum plan portal (`interactive_plan/`)

A **read-only** local portal that shows where the Ferrum project stands, in plain words. It renders
only the plain-language JSON in `../plan/portal/` (written by Claude from the wiki, adr-0024) and
reads `../plan/approvals.json` to show approval state. It writes nothing. The owner steers and
approves in Claude Code; Claude records approvals with `tools/approvals_record.py` (adr-0023).
It is planning tooling, not Ferrum itself.

The layout follows the owner-approved mockups (Layout A, 2026-10-09): top tabs Overview, Roadmap,
Architecture, Decisions, Research, Questions, Log; every id opens a small explainer popup; phases open
in a popup. Status (p0.17, 2026-10-09): the Overview, the phase popup and the reference popup are
built; the other tabs show a placeholder until their views are built in the next step.

## Requirements

- Node 24 LTS (`>=24.15 <27`, see `package.json` `engines`). On this machine Node is in
  `C:\Program Files\nodejs` and is not on the Git Bash PATH by default:
  `export PATH="/c/Program Files/nodejs:$PATH"`.
- `npm ci` once after a fresh clone.

## Start

```bash
cd interactive_plan
npm run start:local     # production build, then http://127.0.0.1:3417/
npm run dev:local       # development server on the same address
```

| Script | What it does |
|---|---|
| `dev`, `dev:local` | `next dev` on 127.0.0.1:`PLAN_PORT` (via `scripts/serve.mjs`) |
| `build` | `next build` |
| `start` | `next start` on 127.0.0.1:`PLAN_PORT` (needs a build) |
| `start:local` | `build`, then `start` |
| `typecheck` | `next typegen && tsc --noEmit` |
| `schemas:portal` | regenerate `lib/portal/schemas.gen.ts` (zod) from `../plan/portal/schema/*.schema.json` |
| `lint` | ESLint |
| `test`, `test:coverage` | Vitest unit tests (with coverage thresholds) |
| `lint:wiki`, `lint:wiki:json` | The normative wiki check (SCHEMA §9.3); command line only |
| `gate` | Entry-gate checklist of every phase; command line only |
| `test:e2e` | Playwright against a production build on 127.0.0.1:3418 that reads the real `plan/` |
| `verify` | typecheck, lint, test, lint:wiki, build, test:e2e in one run |

Every server script goes through `scripts/serve.mjs`, which always binds **127.0.0.1** and uses
**`PLAN_PORT`** (default `3417`). Every route refuses a `Host` other than `127.0.0.1:<port>`,
`localhost:<port>` or `[::1]:<port>` (403) and any method other than GET and HEAD (405), refuses to
be framed, and loads nothing from other hosts (the IBM Plex fonts are self-hosted through
`next/font/local` from the pinned `@fontsource` packages).

## Data

| Path | Used for |
|---|---|
| `../plan/portal/*.json`, `phases/*.json` | everything the pages show; validated with `lib/portal/schemas.gen.ts` |
| `../plan/portal/pipeline.json` | the id patterns: every id-shaped word becomes a clickable reference |
| `../plan/approvals.json` | read-only approval labels in the phase popup |
| `../wiki/`, `../STATUS.md` | only `npm run lint:wiki` and `npm run gate` (not the pages) |

The zod schemas are generated from the JSON Schemas; `tests/unit/portal-schemas.test.ts` fails when
the generated file is stale, checks keyword by keyword that zod rejects what JSON Schema rejects, and
uses PowerShell's `Test-Json` as an independent referee. A file that is missing or does not match its
shape shows as a note at the top of the page; the rest still renders.

| Variable | Default | Meaning |
|---|---|---|
| `PLAN_PORT` | `3417` | Port the server binds and the Host check expects |
| `PLAN_REPO_ROOT` | `..` | Repo root |
| `PLAN_DATA_DIR` | `<root>/plan` | Holds `portal/` and `approvals.json` |
| `PLAN_WIKI_DIR`, `PLAN_STATUS_FILE` | `<root>/wiki`, `<root>/STATUS.md` | For the wiki check only |

## Checks

```bash
npm run verify          # typecheck, eslint, unit tests, lint:wiki, build, Playwright E2E
npm run test:coverage   # unit tests with the coverage thresholds
```

E2E reads the real `plan/` folder (the portal never writes); the teardown fails the run if
`plan/approvals.json`, any `plan/portal` JSON file, `wiki/log.md` or `STATUS.md` changed. Stop any
server on 3418 first (the portal on 3417 can keep running). `IP_REQUIRE_BIND_PROBE=1` makes a machine
without a probe-able network address fail the bind test (set for gate runs).

## History

v1 (build steps IP-0 to IP-10, specified in `../wiki/interactive-plan/`) was a wiki browser with
search, a lint view, an approvals inbox and an approve API. The owner found it too technical
(`../wiki/raw/owner/2026-10-09-s01-plan-app-feedback.md`); task p0.17 replaced it with this portal.
The v1 code is in git history (before commit "feat(portal): read-only portal shell ...").
