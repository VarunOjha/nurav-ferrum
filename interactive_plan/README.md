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
npm run start:local     # production build, then http://127.0.0.1:3417/
npm run dev             # development server on the same address
```

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
