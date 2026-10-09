---
id: ip-testing
type: operations
title: "Interactive plan app: test plan and quality gates"
status: draft
updated: 2026-10-09
sources:
  - raw/research/nextjs-stack.md
  - raw/01-scoping-decisions.md
  - raw/owner/2026-10-09-s01-wave0c.md
  - raw/evidence/phase-p0-planning/interactive-plan/IP-6-tests.txt
  - raw/evidence/phase-p0-planning/interactive-plan/IP-7-tests.txt
  - raw/evidence/phase-p0-planning/interactive-plan/IP-8-tests.txt
  - raw/evidence/phase-p0-planning/interactive-plan/IP-9-verify.txt
  - raw/evidence/phase-p0-planning/interactive-plan/IP-9-perf.txt
related: [ip-spec, ip-data-contract, ip-approvals-api, ip-wiki-lint, ip-routes-and-views, ip-build-plan, comp-interactive-plan, adr-0016, schema]
approvable: true
phase: phase-p0-planning
audience: both
trigger: "Read before writing or changing tests for interactive_plan/, and before declaring any build step of the plan app done"
tags: [interactive-plan, testing, vitest, playwright]
---

# Interactive plan app: test plan

The owner directive is "phase-wise testing and rigorous testing" ([raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md), directive 5). The app holds the project's approval record, so the parts that can lose or misstate an approval (hashing, state, store, guard) get the deepest tests.

Facts used here: Vitest cannot test async Server Components, so logic lives in pure modules. E2E runs against a production build. Next 16 removed `next lint`, so ESLint runs directly. All from [raw/research/nextjs-stack.md](../raw/research/nextjs-stack.md) §3.2 and §3.6. The whole combination installed without peer errors in IP-1 ([IP-1-scaffold.txt](../raw/evidence/phase-p0-planning/interactive-plan/IP-1-scaffold.txt)), and Vitest 5 + Vite 8 run the unit suite on Node 24 since IP-2 ([IP-2-tests.txt](../raw/evidence/phase-p0-planning/interactive-plan/IP-2-tests.txt)). jsdom 30 runs the React component tests with them since IP-6 ([IP-6-tests.txt](../raw/evidence/phase-p0-planning/interactive-plan/IP-6-tests.txt)).

## 0. Commands (the full gate)

| npm script | Command | Must |
|---|---|---|
| `typecheck` | `next typegen && tsc --noEmit` (Next 16 generates `LayoutProps`/`PageProps` into `.next/types`, so plain `tsc --noEmit` fails on a clean checkout; [IP-1-scaffold.txt](../raw/evidence/phase-p0-planning/interactive-plan/IP-1-scaffold.txt); owner answer 2026-10-09, [wave 0c](../raw/owner/2026-10-09-s01-wave0c.md) item 7) | 0 errors |
| `lint` | `eslint .` (flat config, eslint-config-next 16.4.0) | 0 errors, 0 warnings |
| `test` | `vitest run` (unit + component; excludes `tests/lint`, `tests/e2e`; does not load the real wiki pages; the only real files read are `wiki/SCHEMA.md` (schema-sync test, §1.2, and the Python reference of §1.3) and the §7 vector block of `ip-data-contract` (§1.3)) | all pass |
| `test:coverage` | `vitest run --coverage` for `lib/**` | thresholds in §1.6 (provider `@vitest/coverage-v8`, exact pin at install; owner consent is Q-210); since IP-9 the thresholds are configured in `vitest.config.mts` and a miss fails the run |
| `lint:wiki` | `vitest run --config vitest.lint.config.mts`: every test under `tests/lint/` except the gate report, i.e. the [ip-wiki-lint](ip-wiki-lint.md) suite `wiki-lint.test.ts` (IP-5) the real-wiki loader test `real-wiki-loader.test.ts` (IP-2: zero `FM-*` and loader errors, every `sources` path exists) and the real-wiki graph test `real-wiki-graphs.test.ts` (IP-8: 9 phases P0–P8, acyclic, all scheduled; no dangling or TRUST-EDGE component edge; every risk placed once; the research gaps printed, not failed on), all against the **real** wiki, read-only | 0 errors (warnings listed) |
| `lint:wiki:json` | `node scripts/with-env.mjs WIKI_LINT_JSON=1 -- vitest run --config vitest.lint.config.mts`: the same, plus the JSON report (`WIKI_LINT_OUT`, default `.lint/wiki-lint.json`) | as `lint:wiki` |
| `gate` | `vitest run --config vitest.gate.config.mts`: the entry-gate checklist of `GATE_PHASE` or `STATUS.current_phase` ([ip-wiki-lint](ip-wiki-lint.md) §4) | the gate passes |
| `build` | `next build` | succeeds |
| `test:e2e` | `playwright test` (its `webServer` runs `next build && next start -H 127.0.0.1 -p 3418` with temp data dirs) | all pass |
| `verify` | `typecheck && lint && test && lint:wiki && build && test:e2e` | the single "green" command for every build step and future change |
| `perf` | `node scripts/perf-routes.mjs`: times every route's server render on the **real** wiki (production build, `PLAN_READONLY=1`, port 3420; 1 warm-up + 5 runs, median; plus one request after the lint memo expired), the first-load JS per page and the read-only refusal, and checks the real files are unchanged (IP-9) | app evidence only, never a Ferrum result; exit 1 only if a check (status 200, read-only, real files) fails |

E2E uses port 3418, separate from the owner's 3417, plus a second `next start` of the same build on 3419 with `PLAN_READONLY=1` for `security.spec.ts` (since IP-9). Next 16 refuses a second `next dev`/`next build` on the same project ([raw/research/nextjs-stack.md](../raw/research/nextjs-stack.md) §3.2). So **stop the owner's dev server before `npm run test:e2e`**. The E2E config detects a running instance (the port probe fails) and aborts with that message.

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
- **Python cross-check:** if `python --version` succeeds, extract the §10.2 code block from SCHEMA.md into a temp file, run it on each vector written to a temp file, and assert equality. Otherwise the test is skipped with a visible message, never silently. Since IP-3 it also runs the extracted code (one Python process, `sys.argv` set per file) on 401 generated inputs (CR/LF/CRLF mixes, volatile look-alike keys, extra fences, random bytes, one input holding every byte value) and asserts TS = Python, including which inputs raise `ValueError`. The environment variable `IP3_REQUIRE_PYTHON=1` turns a missing Python into a failure; the IP-3 gate run sets it.
- Missing closing fence → `HashError('NO_CLOSING_FENCE')`.
- `normalizeEol` property test: for 1,000 random byte arrays drawn from `{\r, \n, a, 0xFF}`, the result equals a reference `replace(/\r\n/g,'\n').replace(/\r/g,'\n')` over latin1.
- `effectiveState` truth table: each row of SCHEMA §10.3, including:
  - a `#exit` key on a non-phase page → INVALID
  - an unhashable page → INVALID
  - a moved path → state unchanged, `moved: true`
  - `countsAsApproved` true only for APPROVED and APPROVED_VOLATILE_DRIFT
- `entryGate`: dependency not done, dependency exit not approved, a STALE ADR in the set, a blocking open Q, a malformed Q section (fail closed), and all-green.
- **Snapshot diff** (`diff.test.ts`): approve a temp-copy page (snapshot written), edit two body lines, and assert `diff(snapshot, current)` reports exactly those two lines. In IP-3 the test writes the snapshot itself (the normalised bytes, ip-approvals-api §2.1 step 8); that `store.ts` writes it on approval and never overwrites it on a second approval of the same hash is tested with the store in §1.4 (decided 2026-10-09, IP-3).
- **Bootstrap hash:** approve `schema` in a temp data dir, change `CLAUDE.md` in the temp copy, and assert `schema` becomes STALE. In IP-3 the record is built from the loaded hashes and written to the temp data dir by the test (the store comes in IP-4); a line-ending-only change keeps APPROVED, and a missing `CLAUDE.md` gives STALE (fail closed, ip-data-contract §6.2).

### 1.4 Approvals store: concurrency and atomicity (`store.test.ts`)

Each test runs against a fresh temp `PLAN_DATA_DIR` and a fixture wiki copied to a temp dir.

- First write creates `plan/approvals.json`, and its contents validate with zod.
- **Snapshots:** an approval writes `plan/snapshots/<page-id>/<content-hash-hex>.md` holding the normalised bytes (its content hash equals the record's) before the approvals file, and a second approval of the same hash leaves the snapshot byte-identical (moved here from §1.3 in IP-3).
- A second decision on the same key moves the old record into `history`. Three decisions give two history items, in order, and the earlier items are unchanged byte for byte.
- `seen_content_hash` mismatch → `PAGE_CHANGED` and the file is unchanged.
- An invalid existing file (bad JSON, wrong `schema_version`) → `APPROVALS_FILE_INVALID`, and the file is unchanged byte for byte.
- **Parallel writes:** 50 concurrent `submit()` calls on 10 different keys, in one process → all 10 keys present, each key's history length equals its number of submissions − 1, and the file is valid JSON.
- **Cross-process:** spawn 4 child Node processes, each doing 10 submits against the same dir through the store module → no lost updates and no leftover `.tmp-*` or `.lock` files. Since IP-4 the children run `lib/approvals/store.ts` under plain `node` (Node 24 strips the types; `tests/unit/children/approvals-child.mjs` registers a resolve hook that adds the `.ts` extension), with `PLAN_APPEND_LOG` on (40 well-formed `approval` log entries expected), and a fifth child reads `approvals.json` in a loop during the writes and must never see a torn file. The reader reads every 20 ms, and all 40 submits must succeed. A second **stress** variant reads about every millisecond; there a submit may be refused with an explicit `WRITE_FAILED`/`LOCK_TIMEOUT` (Windows refuses a rename over an open file, [ip-approvals-api](ip-approvals-api.md) §4.2), so it asserts that no read is torn, that the file holds exactly the submissions reported as successful (each once), that every failure is one of those two codes, and that nothing is left over. Both print the rename retries per writer with their errno codes. The IP-4 gate runs both 3 times in a row.
- **Crash during write:** inject a failure after the temp file is written and before rename (dependency-injected fs) → the original file is intact, the temp file is cleaned up, and `WRITE_FAILED` is returned.
- **Rename retry:** an injected `EPERM` on the first two rename attempts → success on the third. Five failures → success on the sixth attempt; six failures (`EPERM`, `EBUSY` or `EACCES`) → `WRITE_FAILED`; a non-transient error is not retried. (Decided in IP-4: [ip-approvals-api](ip-approvals-api.md) §4.2, "retried up to 5 times with 20 to 320 ms backoff", wins over the earlier "five failures → `WRITE_FAILED`" here; the cross-process stress test showed the longer budget is worth having.)
- **Stale lock:** a lock file older than 30 s is broken. A fresh lock held by another holder → `LOCK_TIMEOUT` after the timeout, using a fake clock (the lock and the rename backoff take an injectable `{now, sleep}` clock; decided in IP-4 instead of vitest fake timers, which do not drive the fs promises in between). The holder's lock file is left untouched. Since IP-8 two more lock tests use an injected `open`:

- `EPERM`, `EACCES` and `EBUSY` on the exclusive create (the Windows delete-pending case) are retried until the submit succeeds.
- A lock that stays busy gives `LOCK_TIMEOUT` after 3 s, never the raw fs error, and any other open error is rethrown.
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
  - each error code in [ip-approvals-api](ip-approvals-api.md) §2.2 is reachable and has the right HTTP status (`UNHASHABLE`, `LOCK_TIMEOUT` and `WRITE_FAILED` through the store's injected hash function, clock and fs)
  - `PLAN_READONLY=1` → 403
  - `pending` and `changes_requested` statuses are rejected with 400
  - key `schema` without `seen_bootstrap_hash`, or `seen_bootstrap_hash` on another key → 400; a stale `seen_bootstrap_hash` → 409 `PAGE_CHANGED`
  - GET: every approvable key (plus `#exit` per phase) is listed, PENDING without a file, filters by key/state/phase, orphans, an invalid file gives INVALID everywhere, and no side effects
  - `app/api/approvals/route.ts` exports only `GET`, `POST`, `runtime` and `dynamic`, and binds the handlers to the environment config (temp dirs)

### 1.6 Graph and view logic (`graph.test.ts`, `search.test.ts`, `log.test.ts`, `links.test.ts`)

- `componentGraph`: edges, dangling targets, TB flag pass-through.
- `phaseDag`: cycle detection, the schedule (start = max of dependency ends), and the critical path on a fixture with a diamond.
- `traceGraph`: each gap kind listed in [ip-routes-and-views](ip-routes-and-views.md) §3.8 is detected on a fixture.
- `riskMatrix`: placement and score bands.
- `links`: relative-link resolution (`../decisions/x.md#anchor`), anchor existence using the rehype-slug algorithm, and links inside fenced code ignored.
- `log`: heading regex, lenient bullet parsing, malformed headings → `LOG-FORMAT`.
- `search`: ranking order (id > title > alias/tag > heading > body). Since IP-6 `search.test.ts` also covers the other pure view helpers: `/wiki` parameter resolution (only known paths, no `..`), `/go` targets (page id, `Q-NNN`, task id), close matches, markdown link rewriting, the wiki tree, grouped backlinks, the log view model and the status tones.

Since IP-8 `graph.test.ts` (temp wikis built from small pages, plus the mini-wiki) covers:

- every gap kind, with reciprocity exactly as lint REF-RECIPROCAL reports it
- the self-dependency cycle and missing dependencies
- the critical-path tie-break
- the architecture lanes, reading order and no overlaps
- the research column wrap
- the decision register helpers: awaiting-first ordering, filters, the ADR-SECTIONS order rule and the supersession chain (cycle-safe)
- risk sorting in both directions

**Coverage thresholds** (on `lib/**`): 90 % lines and branches for `lib/approvals/**`, 80 % for `lib/wiki/**` and `lib/lint/**`. These are targets set by this plan. Reaching them is checked by the coverage run, not assumed. Since IP-9 they are `coverage.thresholds` globs in `vitest.config.mts`, so `npm run test:coverage` exits 1 when one is missed (checked once with a deliberately raised threshold). The IP-9 run met them ([IP-9-verify.txt](../raw/evidence/phase-p0-planning/interactive-plan/IP-9-verify.txt)); three store tests were added there for uncovered failure paths (a half-written lock judged by mtime, a log that cannot be opened, an unreadable approvals file).

### 1.7 Component tests (jsdom)

Files `tests/unit/components/*.test.tsx`, each with the `// @vitest-environment jsdom` docblock, run by `npm test`. `ApproveBar` is built in IP-7, so its tests run with the component there; IP-6 runs the `Markdown` and `Mermaid` tests (decided 2026-10-09, IP-6).

- `ApproveBar`:
  - comment required for request-changes and reject
  - disabled when the state is INVALID or in read-only mode
  - shows the 409 message
  - announces through `aria-live`
  - since IP-7 also (`approve-bar.test.tsx`, fetch and router mocked): the request body (`seen_content_hash`; `seen_bootstrap_hash` for key `schema` only), other API error codes and network failures, the disabled reasons for an unhashable page and for `schema` without `CLAUDE.md`, the stored decision and history, and the "Diff since approval" toggle (diff lines, or the no-snapshot note)
- IP-7 view models (`views.test.ts`, node): the dashboard strip, progress, last activity, blockers and counts; the inbox tabs, eligible `#exit` keys, current wave, grouping and review cursor; the exit-bar rule, evidence checks and lint grouping of the phase view; the server snapshot diff on a temp copy (the real `plan/approvals.json` is fingerprinted before and after)
- `Markdown`:
  - GFM tables render
  - relative links are rewritten
  - raw `<script>` in markdown is rendered as text, not executed (this verifies the react-markdown claim in [ip-routes-and-views](ip-routes-and-views.md) §3.7)
- `Mermaid`: the error path shows the source (with the mermaid import mocked). Real rendering is E2E. Since IP-6 also: the configuration (`securityLevel: 'strict'`, dagre, classic, the app theme), re-render on a theme change, the show-source toggle, and wiring of nodes that name a page.
- `Markdown` (IP-6 additions): anchors, directory links, `javascript:` links, links outside `wiki/`, images as alt text, heading shift, mermaid blocks, integrity-tag chips and CONTRADICTION blockquotes.

## 2. Wiki lint tests (`tests/lint/`)

- **Golden rule tests** (in `tests/unit/lint-rules.test.ts`, so they run in `npm test`): on `tests/fixtures/broken-wiki/`, every file whose name carries `--CODE[--CODE…]` gives exactly those codes (errors and warnings), `index.md`, `log.md` and `ov-open-questions.md` give exactly their listed findings, and every other file gives none. The counts, lines and messages of the multi-finding rules and the summary line are pinned too. `tests/fixtures/mini-wiki/` gives zero errors and zero warnings. Every lint code has exactly one rule; every code except those that need `approvals.json` or git, and the loader codes of `log.md` and `ov-open-questions.md`, has a named fixture file. The approval-dependent rules (`APPROVAL-STALE` warn/info, `APPROVAL-INVALID`, `STATUS-APPROVED`, `ADR-CHAIN` acceptance, `PHASE-DONE-NO-EXIT`, `UNV-PASTDUE` by phase order) run on a temp mini-wiki copy with in-memory approvals. The git-backed rules (`tests/unit/lint-git.test.ts`) run on an injected fake git, on a real temporary git repository (path containing a space; committed and uncommitted raw changes; MANIFEST appends allowed) and on the manifest fallback.
- **Real-wiki suite** (`npm run lint:wiki`, `tests/lint/`): runs every rule on the real `wiki/` and fails on errors. Every test that loads the real wiki pages lives here, not in `tests/unit/` (the §1.2 schema-sync test, which reads only `wiki/SCHEMA.md`, stays a unit test), so `npm test` does not depend on wiki content (owner answer 2026-10-09, [wave 0c](../raw/owner/2026-10-09-s01-wave0c.md) item 3); the real-wiki loader test of IP-2 is the first member. It must pass at the end of the build workflow. Errors found in pages outside `wiki/interactive-plan/` are reported to the integrator and not fixed by the app builder (area ownership).
- **Gate report** (`npm run gate`, `tests/lint/gate-report.test.ts`, own config): it runs on the real wiki and prints the checklist for `STATUS.current_phase` (`phase-p0-planning`). The formatter is unit-tested on the mini-wiki (blocked, passed, an invalid approvals file fails closed, unknown phase).
- **Parity with the Python fallback** (`lint-parity.test.ts`): if `python --version` succeeds, run `tools/quick_lint.py` (SCHEMA §9.3 fallback, Q-216) on `tests/fixtures/mini-wiki/` and `tests/fixtures/broken-wiki/` and assert that the set of `{code, path}` findings for the codes the Python script covers equals the TS lint's set for those codes, apart from an explicit list of known differences, each with its reason. The stdlib script has no YAML parser, keeps the BOM, checks `index.md` lines as body links and reports an `ID-DUP` only on the later file. The TS lint adds anchor, `sources`, task-reference and tag-phase checks. Any other difference fails the test (decided 2026-10-09, IP-5). Skipped with a visible message if Python is absent.

## 3. E2E (Playwright 1.64; `tests/e2e/`)

**Setup** (`tests/e2e/setup-env.ts`, called from `playwright.config.ts`):

1. Copy `tests/fixtures/mini-wiki/` → `<tmp>/wiki/`, then copy `tests/fixtures/e2e-overlay/` over it, write the fixture `<tmp>/STATUS.md` (from `tests/fixtures/status/`) and create an empty `<tmp>/plan/` (no `approvals.json`, so every key starts PENDING). `<tmp>` is `<os tmp>/ferrum plan e2e/run-*`.
2. Set `PLAN_REPO_ROOT=<tmp>`, `PLAN_WIKI_DIR`, `PLAN_DATA_DIR` and `PLAN_STATUS_FILE` for the `webServer`.
3. Build and start (`npm run build && npx next start -H 127.0.0.1 -p 3418`).

Since IP-7 the overlay also holds `phases/phase-p2-fixture-review.md` (status `gate-review`, so its `#exit` key is eligible) and one evidence file for it under `raw/evidence/phase-p2-fixture-review/`. The specs that change temp files (`approval-flow`, `approval-race`, `exit-approval`, `dashboard`) save the bytes they touch (page files, `<tmp>/plan/approvals.json`, `<tmp>/wiki/log.md`) in `beforeAll` and restore them in `afterAll`, so every spec sees the fixture as shipped whatever the file order; they also check mid-run that the real guarded files are unchanged. The dashboard spec writes a known `<tmp>/plan/approvals.json` (records computed from the fixture files: one APPROVED, one REJECTED, one STALE, one orphan) so its expected counts are fixed (decided 2026-10-09, IP-7).

Since IP-8 the overlay also holds `research/questions/rq-92-fixture-unanswered.md` (no hypotheses), `research/experiments/exp-fixture-nometrics.md` (no metrics, in no phase's `experiments`) and `risks/risk-r92-fixture-resolved.md` (resolved, L1 I2), for the research and risks specs. All three are `approvable: false`, so the dashboard spec's fixed approval counts do not change (decided 2026-10-09, IP-8).

Decided 2026-10-09 (IP-6): the setup runs when the config is loaded, not in a `globalSetup` file, because Playwright starts the `webServer` before `globalSetup`; worker processes inherit `PLAN_E2E_ROOT` and skip it. The overlay holds the E2E-only cases (a dangling link, an integrity tag, a CONTRADICTION blockquote, raw HTML, a malformed log heading) that the lint-clean `mini-wiki` must not contain (§2).

The tests **never touch the real `plan/approvals.json` or `wiki/`**. The guard in `tests/e2e/global-teardown.ts` fails the run if the real `plan/approvals.json`, `wiki/log.md` or `STATUS.md` changed (mtime and sha256), then removes the temp copy. The temp dir is deliberately created under a directory name containing a space; `next build` and `next start` run against it on Windows ([IP-6-tests.txt](../raw/evidence/phase-p0-planning/interactive-plan/IP-6-tests.txt)).

| Spec | Asserts |
|---|---|
| `views.spec.ts` | Each route in [ip-routes-and-views](ip-routes-and-views.md) §1 returns 200, has an `h1`, and logs no console errors. 404 for an unknown id. `/go/<id>` redirects. Since the IP-9 review: the 404 views log no console error (the pre-paint theme script is a data block when React renders the layout on the client) and keep the stored theme |
| `dashboard.spec.ts` | `next_action` from the fixture STATUS.md is shown verbatim. Approval counts equal the fixture's expected counts. `blocked_on` links resolve. Since IP-7 also: the top-bar counter, the `?state=` link into the inbox, the phase strip and budget, the gate card, blockers, recent log and the `/lint` report |
| `architecture.spec.ts` | Node count equals the fixture components. A TB edge has the TB marker. Clicking a node opens the panel with a page link. The edge table alternative exists. Since IP-8 also: keyboard only (Tab in reading order, Enter/Space opens the panel, Close returns focus), lanes, the not-shipped marking and the URL filters |
| `roadmap.spec.ts` | One DAG node per fixture phase. The E2E fixture has 3 phases; the real wiki's 9 phase nodes are asserted by `tests/lint/real-wiki-graphs.test.ts` (decided 2026-10-09, IP-8). Bar widths are proportional to `est_sessions`. Clicking navigates to the phase. Since IP-8 also: bars start at the end of their dependency, the critical path, milestones, keyboard Tab/Enter, and the exit column shows only eligible exit keys |
| `risks.spec.ts` | Heatmap cell (L, I) contains the fixture risk id. The table is sortable by score (both directions, `aria-sort`). Since IP-8 also: row and column headers, band attributes, and the "open + mitigating only" toggle |
| `research.spec.ts` | Fixture gaps (an rq without hypotheses, an exp without metrics) are highlighted and listed. Since IP-8 also: the column order, the support and preregistration badges, the nested text alternative, the `?rq=` filter and click-through |
| `decisions.spec.ts` | Added in IP-8 (not in the original plan): the register lists `adr-0901` as claude-proposed and awaiting approval, and its filters work. The detail view shows the approve bar, all five required sections and the pages listing the ADR. `/go/adr-0901` redirects to `/decisions/adr-0901`. Unknown and non-decision ids give 404 |
| `wiki.spec.ts` | A page renders GFM tables. A mermaid block renders an SVG (real mermaid, both themes). Backlinks list the expected ids. Search finds a body word. A dangling link is styled as missing. A raw file shows the immutable banner and no approve bar |
| `log.spec.ts` | Entries newest-first. The op filter works. A malformed heading appears as a finding |
| **`approval-flow.spec.ts`** | **(1)** inbox shows fixture page `adr-0901` as PENDING → **(2)** open it, Approve → the UI shows APPROVED → **(3)** read `<tmp>/plan/approvals.json` from the test: the record has `status: approved`, both hashes equal the Node-computed hashes of the fixture file, `approved_by: owner`, and a valid timestamp → **(4)** edit only `status:`/`updated:` in the fixture file → reload → APPROVED_VOLATILE_DRIFT → **(5)** edit the body → reload → **STALE**, and the inbox lists it under Stale → **(6)** Request changes with an empty comment is blocked; with a comment → CHANGES_REQUESTED and `history` length 1 → **(7)** `log.md` gained `approval` entries in the SCHEMA §12 format |
| `approval-race.spec.ts` | Load the page, modify the file on disk, then click Approve → 409 message shown, and approvals.json unchanged (page `ov-fixture-project`; `log.md` unchanged too) |
| `exit-approval.spec.ts` | The exit bar is hidden for a `planned` phase. For a `gate-review` fixture phase it is shown, and approving writes the key `<phase-id>#exit`. Since IP-7 also: the API answers 409 `EXIT_NOT_READY` for the planned phase's exit key, and the phase view shows the entry gate, tasks, risk scores and evidence ✓/✗ |
| `security.spec.ts` | POST with `Origin: http://evil.example` → 403. POST with `Host: evil.example:3418` → 403. `text/plain` → 415. PUT → not 2xx. `PLAN_READONLY=1` server project → buttons disabled, POST 403. Since IP-9 (decided 2026-10-09): raw `node:http` requests so the `Host` header is exactly the test's; also a GET with a foreign Host → 403, a missing Origin and `Sec-Fetch-Site: cross-site` → 403, PATCH/DELETE not 2xx, no `Access-Control-Allow-*` on a preflight, and a same-origin control request that reaches the store (409). Every refusal leaves the temp `approvals.json` byte-identical. The read-only server is a second Playwright `webServer` (3419, same build and fixture, `PLAN_READONLY=1`): banner shown, every approve and exit button and the comment box disabled with the reason, a valid POST → 403 `READ_ONLY`. **Bind:** both servers accept 127.0.0.1 and refuse (`ECONNREFUSED`) every non-loopback address of the machine (IPv4, IPv6, link-local); a throwaway listener on all interfaces must be reachable on each address first, so a refusal means "not listening there". If the machine has no non-loopback address, or none of its IPv4 addresses passes that control (offline, Wi-Fi off), the bind test is **skipped with a visible reason** so `npm run verify` stays meaningful offline; `IP_REQUIRE_BIND_PROBE=1` (set for gate runs, like `IP3_REQUIRE_PYTHON`) turns that into a failure. **Since the IP-9 review (2026-10-09):** a spoofed `Host` gets 403 on every page route and on a `/_next/static` asset (`proxy.ts`), loopback Hosts get `X-Frame-Options: DENY` and the same-origin CSP, and a page on another origin that frames the app and clicks where the approve button is gets a blocked frame and sends no POST (clickjacking) |
| `layout.spec.ts` | Since the IP-9 review: at 390 px no horizontal page overflow on the phase, research, approvals, decisions and dashboard views; research graph nodes do not clip their content; id/key/phase/date cells in the inbox and decision register stay on one line; `/log` links no id containing brackets, parentheses or spaces and shows a list's trailing note as text |
| `a11y.spec.ts` | Keyboard only: reach and operate the approve bar, navigate graph nodes, toggle theme. Every page has a single `h1` and landmarks. Optional axe scan if the owner approves `@axe-core/playwright` ([ip-spec](ip-spec.md) §9 item 5). Since IP-9: 16 routes checked for `lang`, one `h1`, banner/navigation/main/contentinfo, a first-Tab skip link that moves focus to `main`, and an accessible name on every visible link, button and form field; from the skip link, Tab reaches the comment box, then Approve / Request changes / Reject in order; Request changes without a comment gives the alert, with one (Space) records `changes-requested` (temp files restored); Tab + Enter on architecture, roadmap and research nodes; the theme toggle by Enter and Space. No axe scan: Q-008 is still open |
| `theme.spec.ts` | `prefers-color-scheme: dark` emulation gives dark tokens. The toggle overrides and persists across reloads. No flash: the attribute is set before first paint, checked via the initial HTML |

The fixture wiki uses ids in a reserved fixture range (`adr-09xx`, `risk-r9x`, `rq-9x`) so they can never be confused with real pages, and it validates clean under `lint:wiki` (asserted in §2).

## 4. Manual checks (owner, at the end of the build workflow)

1. Run `npm run start:local` (production build on 127.0.0.1:3417). Open the dashboard and check that it matches STATUS.md.
2. Approve one real page, for example `ip-spec`. Check `plan/approvals.json` and the new log entry in git diff.
3. Toggle light and dark. Check the architecture graph and one mermaid diagram are readable in both.
4. Confirm the app is not reachable from another device or from the machine's LAN IP (checks the loopback bind).

## 5. Evidence

IP-9 saved `IP-9-verify.txt` (verify + coverage), `IP-9-perf.txt` (`npm run perf`) and `playwright-report.zip`. At the end of the build workflow, the outputs of `npm run verify` and `npm run lint:wiki:json` (and the Playwright HTML report, zipped) go to `wiki/raw/evidence/phase-p0-planning/interactive-plan/`, with the date and the `node -v` / `npm -v` output. A pass is never claimed without saved output (SCHEMA §9.7).
