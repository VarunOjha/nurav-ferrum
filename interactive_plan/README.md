# Ferrum plan app (`interactive_plan/`)

Local planning tool for the Ferrum wiki: browse, search, review and approve the planning pages.
It reads `../wiki/`, `../STATUS.md` and `../CLAUDE.md` at request time and writes only
`../plan/approvals.json` (plus `approval` entries in `../wiki/log.md` unless `PLAN_APPEND_LOG=0`).
It is the planning tool, not Ferrum itself. The spec is in `wiki/interactive-plan/` (start with
`ip-spec.md`).

## Requirements

- Node 24 LTS (`>=24.15 <27`, see `package.json` `engines`). On this machine Node is in
  `C:\Program Files\nodejs` and is not on the Git Bash PATH by default:
  `export PATH="/c/Program Files/nodejs:$PATH"`.
- `npm ci` once after a fresh clone.

## Start

```bash
cd interactive_plan
export PATH="/c/Program Files/nodejs:$PATH"   # Git Bash on this machine only
npm run dev:local       # development server -> http://127.0.0.1:3417/
npm run start:local     # production build, then the same address (faster pages)
```

Then open <http://127.0.0.1:3417/>. The dashboard shows the current phase, the next action from
`STATUS.md` and the approvals that are due; `/approvals` is the review inbox.

| Script | What it does |
|---|---|
| `dev`, `dev:local` | `next dev` on 127.0.0.1:`PLAN_PORT` (via `scripts/serve.mjs`) |
| `build` | `next build` |
| `start` | `next start` on 127.0.0.1:`PLAN_PORT` (needs a build) |
| `start:local` | `build`, then `start` |
| `typecheck` | `next typegen && tsc --noEmit` |
| `lint` | ESLint |
| `test`, `test:coverage` | Vitest unit and component tests (with coverage thresholds) |
| `lint:wiki`, `lint:wiki:json` | The normative wiki lint (JSON report with `WIKI_LINT_JSON=1`) |
| `gate` | Entry-gate checklist of every phase |
| `test:e2e` | Playwright against a temp fixture copy on ports 3418/3419 |
| `perf` | Server-render timing per route on the real wiki, read-only |
| `verify` | typecheck, lint, test, lint:wiki, build, test:e2e in one run |

Every server script (`dev`, `dev:local`, `start`, `start:local`) goes through
`scripts/serve.mjs`, which always binds **127.0.0.1** and uses **`PLAN_PORT`** (default `3417`).
Open the URL the script prints; another port is `PLAN_PORT=4000 npm run start:local`. Do not run
`next dev`/`next start` directly: without `-H 127.0.0.1` Next binds every interface, and on a port
other than `PLAN_PORT` every request is refused by the Host check.

The app only answers requests whose `Host` is `127.0.0.1:<port>`, `localhost:<port>` or
`[::1]:<port>` (403 otherwise, every route), refuses to be framed, and accepts approval POSTs only
from its own page (ip-approvals-api §3).

## Environment

| Variable | Default | Meaning |
|---|---|---|
| `PLAN_PORT` | `3417` | Port the server binds and the Host/Origin guard expects |
| `PLAN_REPO_ROOT` | `..` | Repo root (holds `wiki/`, `STATUS.md`, `CLAUDE.md`, `plan/`) |
| `PLAN_WIKI_DIR` | `<root>/wiki` | Wiki directory (read-only) |
| `PLAN_STATUS_FILE` | `<root>/STATUS.md` | Live status file (read-only) |
| `PLAN_DATA_DIR` | `<root>/plan` | Where `approvals.json` lives |
| `PLAN_READONLY` | unset | `1` disables every write (approve buttons disabled, POST 403) |
| `PLAN_APPEND_LOG` | `1` | `0` stops appending `approval` entries to `wiki/log.md` |

## Checks

```bash
npm run verify          # typecheck, eslint, unit tests, lint:wiki, build, Playwright E2E
npm run test:coverage   # unit tests with the coverage thresholds
npm run lint:wiki       # the normative wiki lint (SCHEMA §9.3); lint:wiki:json writes a report
npm run gate            # entry-gate checklist for the phases
npm run perf            # server-render timing per route on the real wiki (read-only)
```

E2E runs against a temporary copy of a fixture wiki on ports 3418 and 3419; it never touches the
real `plan/approvals.json`, `wiki/log.md` or `STATUS.md` (the teardown checks this). Stop any server
on 3418/3419 first. `IP3_REQUIRE_PYTHON=1` makes a missing Python fail the hash cross-check and
`IP_REQUIRE_BIND_PROBE=1` makes a machine without a probe-able network address fail the bind test
(both are set for gate runs).

## Approvals

Approve, request changes or reject in the app only (approve bars on `/approvals`, `/phases/<id>`,
`/decisions/<id>` and every approvable `/wiki` page). Claude never writes `plan/approvals.json`
(SCHEMA §10.1). There is no bulk approve and no reset to pending (owner answer Q-007).

## Spec pages

Everything here is specified in `../wiki/interactive-plan/`:
[ip-spec](../wiki/interactive-plan/ip-spec.md) (scope, stack, principles),
[ip-data-contract](../wiki/interactive-plan/ip-data-contract.md) (reads, writes, hashes, states),
[ip-routes-and-views](../wiki/interactive-plan/ip-routes-and-views.md) (routes and UI rules),
[ip-approvals-api](../wiki/interactive-plan/ip-approvals-api.md) (`/api/approvals`, guards, atomic writes),
[ip-wiki-lint](../wiki/interactive-plan/ip-wiki-lint.md) (`lint:wiki`, `gate`),
[ip-testing](../wiki/interactive-plan/ip-testing.md) (tests, gates, manual checks in §4) and
[ip-build-plan](../wiki/interactive-plan/ip-build-plan.md) (build steps IP-0 to IP-10). The governing
decision is [adr-0016](../wiki/decisions/adr-0016-interactive-plan-nextjs.md); the data rules are
[SCHEMA](../wiki/SCHEMA.md) §5, §6 and §10. Build evidence: `../wiki/raw/evidence/phase-p0-planning/interactive-plan/`.

## Known issues

- `/architecture`: when a component is hovered, focused or opened, its full edge labels can overlap
  each other and nearby nodes (review of 2026-10-09; open). The edge table below the graph lists the
  same edges in full.
