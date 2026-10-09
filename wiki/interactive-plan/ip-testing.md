---
id: ip-testing
type: operations
title: "Interactive plan app: test plan and quality gates"
status: draft
updated: 2026-10-08
sources:
  - raw/research/nextjs-stack.md
  - raw/01-scoping-decisions.md
related: [ip-spec, ip-data-contract, ip-approvals-api, ip-wiki-lint, ip-routes-and-views, ip-build-plan, comp-interactive-plan, adr-0016, schema]
approvable: true
phase: phase-p0-planning
audience: both
trigger: "Read before writing or changing tests for interactive_plan/, and before declaring any build step of the plan app done"
tags: [interactive-plan, testing, vitest, playwright]
unverified:
  - claim: "The Vitest 5 + Vite 8 + @vitejs/plugin-react 6 + jsdom 30 combination installs and runs together on Node 24"
    verify_in: phase-p0-planning
  - claim: "Playwright 1.64 webServer can run next build and next start against a temp PLAN_DATA_DIR and PLAN_WIKI_DIR on Windows with a path containing a space"
    verify_in: phase-p0-planning
---

# Interactive plan app: test plan

The owner directive is "phase-wise testing and rigorous testing" ([raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md), directive 5). The app holds the project's approval record, so the parts that can lose or misstate an approval (hashing, state, store, guard) get the deepest tests.

Facts used here: Vitest cannot test async Server Components, so logic lives in pure modules. E2E runs against a production build. Next 16 removed `next lint`, so ESLint runs directly. All from [raw/research/nextjs-stack.md](../raw/research/nextjs-stack.md) §3.2 and §3.6. That the whole tool combination runs together is `UNVERIFIED[phase-p0-planning]` and is checked in IP-1 of [ip-build-plan](ip-build-plan.md).

## 0. Commands (the full gate)

| npm script | Command | Must |
|---|---|---|
| `typecheck` | `tsc --noEmit` | 0 errors |
| `lint` | `eslint .` (flat config, eslint-config-next 16.4.0) | 0 errors, 0 warnings |
| `test` | `vitest run` (unit + component; excludes `tests/lint`, `tests/e2e`) | all pass |
| `test:coverage` | `vitest run --coverage` for `lib/**` | thresholds in §1.6 (provider `@vitest/coverage-v8`, exact pin at install; owner consent is Q-210) |
| `lint:wiki` | [ip-wiki-lint](ip-wiki-lint.md) suite against the **real** wiki | 0 errors (warnings listed) |
| `build` | `next build` | succeeds |
| `test:e2e` | `playwright test` (its `webServer` runs `next build && next start -H 127.0.0.1 -p 3418` with temp data dirs) | all pass |
| `verify` | `typecheck && lint && test && lint:wiki && build && test:e2e` | the single "green" command for every build step and future change |

E2E uses port 3418, separate from the owner's 3417. Next 16 refuses a second `next dev`/`next build` on the same project ([raw/research/nextjs-stack.md](../raw/research/nextjs-stack.md) §3.2). So **stop the owner's dev server before `npm run test:e2e`**. The E2E config detects a running instance (the port probe fails) and aborts with that message.

## 1. Unit tests (vitest; `tests/unit/`)

Pure `lib/` modules run under environment `node`. React components run under `jsdom` with Testing Library.

### 1.1 Frontmatter parsing (`frontmatter.test.ts`)

- Valid page → `{fm, body}`. CRLF input parses the same as LF.
- No opening fence, no closing fence, or a BOM → the right finding codes.
- Anchors, aliases, tags and multi-doc input are rejected (`FM-YAML-SUBSET`). Duplicate keys are rejected.
- Volatile keys as block scalars are rejected (`FM-VOLATILE`).
- A date like `2026-10-08` stays the string `"2026-10-08"`. This pins the yaml behaviour from [ip-data-contract](ip-data-contract.md) §3.2.
- Strings with `: ` that are not quoted produce the YAML error, not a silent mis-parse.
- Final-newline rule: zero, one and two trailing `\n`.

### 1.2 Schema validation (`schemas.test.ts`, `schema-sync.test.ts`)

- For **each** page type: one minimal valid fixture passes, and each required field removed in turn fails with `FM-MISSING`. Each enum gets an invalid value (`FM-ENUM`). Unknown keys produce `FM-UNKNOWN-KEY` and nothing more.
- Id regexes per SCHEMA §8, with valid and invalid examples per type, plus the basename rule.
- **Schema sync test:** parses `wiki/SCHEMA.md`, extracting:
  - each `- status:` enum line under the `### 6.N` headings and the §6.16 singleton table
  - the §5.1 `type` enum
  - the §6.2 `kind` enum
  - the §8 regexes

  It asserts that they equal the constants in `lib/wiki/schemas.ts`. A SCHEMA change that is not mirrored in the app fails the test. SCHEMA §15 requires the parser to be updated "in the same change set".

### 1.3 Hash and stale logic (`hash.vectors.test.ts`, `state.test.ts`)

- All vectors in [ip-data-contract](ip-data-contract.md) §7, read from that page's fenced `json` block at test time. Both hashes must match exactly.
- **Python cross-check:** if `python --version` succeeds, extract the §10.2 code block from SCHEMA.md into a temp file, run it on each vector written to a temp file, and assert equality. Otherwise the test is skipped with a visible message, never silently.
- Missing closing fence → `HashError('NO_CLOSING_FENCE')`.
- `normalizeEol` property test: for 1,000 random byte arrays drawn from `{\r, \n, a, 0xFF}`, the result equals a reference `replace(/\r\n/g,'\n').replace(/\r/g,'\n')` over latin1.
- `effectiveState` truth table: each row of SCHEMA §10.3, including:
  - a `#exit` key on a non-phase page → INVALID
  - an unhashable page → INVALID
  - a moved path → state unchanged, `moved: true`
  - `countsAsApproved` true only for APPROVED and APPROVED_VOLATILE_DRIFT
- `entryGate`: dependency not done, dependency exit not approved, a STALE ADR in the set, a blocking open Q, a malformed Q section (fail closed), and all-green.
- **Snapshot diff** (`diff.test.ts`): approve a temp-copy page (snapshot written), edit two body lines, and assert `diff(snapshot, current)` reports exactly those two lines; a snapshot is never overwritten by a second approval of the same hash.
- **Bootstrap hash:** approve `schema` in a temp data dir, change `CLAUDE.md` in the temp copy, and assert `schema` becomes STALE.

### 1.4 Approvals store: concurrency and atomicity (`store.test.ts`)

Each test runs against a fresh temp `PLAN_DATA_DIR` and a fixture wiki copied to a temp dir.

- First write creates `plan/approvals.json`, and its contents validate with zod.
- A second decision on the same key moves the old record into `history`. Three decisions give two history items, in order, and the earlier items are unchanged byte for byte.
- `seen_content_hash` mismatch → `PAGE_CHANGED` and the file is unchanged.
- An invalid existing file (bad JSON, wrong `schema_version`) → `APPROVALS_FILE_INVALID`, and the file is unchanged byte for byte.
- **Parallel writes:** 50 concurrent `submit()` calls on 10 different keys, in one process → all 10 keys present, each key's history length equals its number of submissions − 1, and the file is valid JSON.
- **Cross-process:** spawn 4 child Node processes, each doing 10 submits against the same dir through the store module → no lost updates and no leftover `.tmp-*` or `.lock` files.
- **Crash during write:** inject a failure after the temp file is written and before rename (dependency-injected fs) → the original file is intact, the temp file is cleaned up, and `WRITE_FAILED` is returned.
- **Rename retry:** an injected `EPERM` on the first two rename attempts → success on the third. Five failures → `WRITE_FAILED`.
- **Stale lock:** a lock file older than 30 s is broken. A fresh lock held by another holder → `LOCK_TIMEOUT` after the timeout, using fake timers.
- Serialisation is stable: keys sorted, 2-space indent, trailing `\n`, LF only.
- **Log append:** an entry is appended in the SCHEMA §12 format, the file still ends with exactly one `\n`, and a missing log returns the `LOG_MISSING` warning without creating the file.

### 1.5 Guard and route adapter (`guard.test.ts`, `route.test.ts`)

- `checkLocal` header matrix:
  - Host ∈ {`127.0.0.1:p`, `localhost:p`, `[::1]:p`}, accepted
  - wrong port, `evil.example:p`, missing Host → 403
  - Origin missing, `null`, a different origin, or a matching origin with `Sec-Fetch-Site: cross-site` → 403
  - content types: `application/json` OK, `text/plain` → 415, `multipart/form-data` → 415
  - body over 16 KiB → 400
- Route adapter, with the handler called directly through a `Request` object:
  - each error code in [ip-approvals-api](ip-approvals-api.md) §2.2 is reachable and has the right HTTP status
  - `PLAN_READONLY=1` → 403
  - `pending` and `changes_requested` statuses are rejected with 400

### 1.6 Graph and view logic (`graph.test.ts`, `search.test.ts`, `log.test.ts`, `links.test.ts`)

- `componentGraph`: edges, dangling targets, TB flag pass-through.
- `phaseDag`: cycle detection, the schedule (start = max of dependency ends), and the critical path on a fixture with a diamond.
- `traceGraph`: each gap kind listed in [ip-routes-and-views](ip-routes-and-views.md) §3.8 is detected on a fixture.
- `riskMatrix`: placement and score bands.
- `links`: relative-link resolution (`../decisions/x.md#anchor`), anchor existence using the rehype-slug algorithm, and links inside fenced code ignored.
- `log`: heading regex, lenient bullet parsing, malformed headings → `LOG-FORMAT`.
- `search`: ranking order (id > title > alias/tag > heading > body).

**Coverage thresholds** (on `lib/**`): 90 % lines and branches for `lib/approvals/**`, 80 % for `lib/wiki/**` and `lib/lint/**`. These are targets set by this plan. Reaching them is checked by the coverage run, not assumed.

### 1.7 Component tests (jsdom)

- `ApproveBar`:
  - comment required for request-changes and reject
  - disabled when the state is INVALID or in read-only mode
  - shows the 409 message
  - announces through `aria-live`
- `Markdown`:
  - GFM tables render
  - relative links are rewritten
  - raw `<script>` in markdown is rendered as text, not executed (this verifies the react-markdown claim in [ip-routes-and-views](ip-routes-and-views.md) §3.7)
- `Mermaid`: the error path shows the source (with the mermaid import mocked). Real rendering is E2E.

## 2. Wiki lint tests (`tests/lint/`)

- **Golden rule tests** (in `tests/unit/lint-rules.test.ts`, so they run in `npm test`): each rule against `tests/fixtures/broken-wiki/` gives exactly the expected `{code, path}` set (snapshot), and `tests/fixtures/mini-wiki/` gives zero errors.
- **Real-wiki suite** (`npm run lint:wiki`): runs every rule on the real `wiki/` and fails on errors. It must pass at the end of the build workflow. Errors found in pages outside `wiki/interactive-plan/` are reported to the integrator and not fixed by the app builder (area ownership).
- **Gate report** (`npm run gate`): a smoke test that it runs and prints a checklist for `phase-p0-planning`.
- **Parity with the Python fallback** (`lint-parity.test.ts`): if `python --version` succeeds, run `tools/quick_lint.py` (SCHEMA §9.3 fallback, Q-216) on `tests/fixtures/mini-wiki/` and `tests/fixtures/broken-wiki/` and assert that the set of `{code, path}` findings for the codes the Python script covers equals the TS lint's set for those codes. Skipped with a visible message if Python is absent.

## 3. E2E (Playwright 1.64; `tests/e2e/`)

**Setup** (`global-setup.ts`):

1. Copy `tests/fixtures/mini-wiki/` → `<tmp>/wiki/` and `tests/fixtures/plan/` → `<tmp>/plan/`, and write a fixture `<tmp>/STATUS.md`.
2. Set `PLAN_REPO_ROOT=<tmp>`, `PLAN_WIKI_DIR`, `PLAN_DATA_DIR` and `PLAN_STATUS_FILE` for the `webServer`.
3. Build and start (`next build && next start -H 127.0.0.1 -p 3418`).

The tests **never touch the real `plan/approvals.json` or `wiki/`**. A guard test asserts that the real file's mtime and hash are unchanged after the run. Running against a temp dir on a Windows path containing a space is `UNVERIFIED[phase-p0-planning]`, so the temp dir is deliberately created under a directory name containing a space.

| Spec | Asserts |
|---|---|
| `views.spec.ts` | Each route in [ip-routes-and-views](ip-routes-and-views.md) §1 returns 200, has an `h1`, and logs no console errors. 404 for an unknown id. `/go/<id>` redirects |
| `dashboard.spec.ts` | `next_action` from the fixture STATUS.md is shown verbatim. Approval counts equal the fixture's expected counts. `blocked_on` links resolve |
| `architecture.spec.ts` | Node count equals the fixture components. A TB edge has the TB marker. Clicking a node opens the panel with a page link. The edge table alternative exists |
| `roadmap.spec.ts` | 9 phase nodes. Bar widths are proportional to `est_sessions`. Clicking navigates to the phase |
| `risks.spec.ts` | Heatmap cell (L, I) contains the fixture risk id. The table is sortable by score |
| `research.spec.ts` | Fixture gaps (an rq without hypotheses, an exp without metrics) are highlighted and listed |
| `wiki.spec.ts` | A page renders GFM tables. A mermaid block renders an SVG (real mermaid, both themes). Backlinks list the expected ids. Search finds a body word. A dangling link is styled as missing. A raw file shows the immutable banner and no approve bar |
| `log.spec.ts` | Entries newest-first. The op filter works. A malformed heading appears as a finding |
| **`approval-flow.spec.ts`** | **(1)** inbox shows fixture page `adr-0901` as PENDING → **(2)** open it, Approve → the UI shows APPROVED → **(3)** read `<tmp>/plan/approvals.json` from the test: the record has `status: approved`, both hashes equal the Node-computed hashes of the fixture file, `approved_by: owner`, and a valid timestamp → **(4)** edit only `status:`/`updated:` in the fixture file → reload → APPROVED_VOLATILE_DRIFT → **(5)** edit the body → reload → **STALE**, and the inbox lists it under Stale → **(6)** Request changes with an empty comment is blocked; with a comment → CHANGES_REQUESTED and `history` length 1 → **(7)** `log.md` gained `approval` entries in the SCHEMA §12 format |
| `approval-race.spec.ts` | Load the page, modify the file on disk, then click Approve → 409 message shown, and approvals.json unchanged |
| `exit-approval.spec.ts` | The exit bar is hidden for a `planned` phase. For a `gate-review` fixture phase it is shown, and approving writes the key `<phase-id>#exit` |
| `security.spec.ts` | POST with `Origin: http://evil.example` → 403. POST with `Host: evil.example:3418` → 403. `text/plain` → 415. PUT → not 2xx. `PLAN_READONLY=1` server project → buttons disabled, POST 403 |
| `a11y.spec.ts` | Keyboard only: reach and operate the approve bar, navigate graph nodes, toggle theme. Every page has a single `h1` and landmarks. Optional axe scan if the owner approves `@axe-core/playwright` ([ip-spec](ip-spec.md) §9 item 5) |
| `theme.spec.ts` | `prefers-color-scheme: dark` emulation gives dark tokens. The toggle overrides and persists across reloads. No flash: the attribute is set before first paint, checked via the initial HTML |

The fixture wiki uses ids in a reserved fixture range (`adr-09xx`, `risk-r9x`, `rq-9x`) so they can never be confused with real pages, and it validates clean under `lint:wiki` (asserted in §2).

## 4. Manual checks (owner, at the end of the build workflow)

1. Run `npm run start:local` (production build on 127.0.0.1:3417). Open the dashboard and check that it matches STATUS.md.
2. Approve one real page, for example `ip-spec`. Check `plan/approvals.json` and the new log entry in git diff.
3. Toggle light and dark. Check the architecture graph and one mermaid diagram are readable in both.
4. Confirm the app is not reachable from another device or from the machine's LAN IP (checks the loopback bind).

## 5. Evidence

At the end of the build workflow, the outputs of `npm run verify` and `npm run lint:wiki:json` (and the Playwright HTML report, zipped) go to `wiki/raw/evidence/phase-p0-planning/interactive-plan/`, with the date and the `node -v` / `npm -v` output. A pass is never claimed without saved output (SCHEMA §9.7).
