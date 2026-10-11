---
id: status-live
type: status
title: "Ferrum live status and next action"
status: active
updated: 2026-10-11
sources:
  - raw/01-scoping-decisions.md
  - raw/research/nextjs-stack.md
  - raw/owner/2026-10-08-s01-wave0b.md
  - raw/owner/2026-10-09-s01-wave0c.md
  - raw/owner/2026-10-09-s01-plan-app-feedback.md
  - raw/owner/2026-10-09-s01-portal-v2-decisions.md
  - raw/owner/2026-10-10-s01-q008-and-pause.md
  - raw/owner/2026-10-11-s01-wave1-answers-and-p0-signoff.md
  - raw/owner/2026-10-11-s01-wave2-pages-approval.md
  - raw/owner/2026-10-11-s02-p1-go-ahead.md
related: [ops-portal-pipeline, adr-0023, adr-0024, adr-0025, adr-0026, adr-0027, phase-p0-planning, phase-p1-foundation, ops-approval-workflow, ip-build-plan, ops-session-protocol, ops-resume-after-interruption, ops-environment-setup, ops-multi-agent-workflow, ops-wiki-maintenance, ov-open-questions, schema]
approvable: false
session: s02
current_phase: phase-p1-foundation
current_task: p1.14
next_action: "Task p1.14 (research track start): write wiki/research/ov-research-literature-protocol.md and ov-research-literature-log.md (add to index.md), fetch and record at least one new raw research note in wiki/raw/research/ with access dates and VERIFIED/UNCERTAIN labels covering the seed list gaps; run scripts/verify/p1.14-literature-start.ps1."
blocked_on: []
last_handoff: handoff-2026-10-09-s01
---

# STATUS — live state (read this first every session)

> Updated after every completed task and at every handoff (SCHEMA §9.5). If git disagrees with this
> file, trust git + `wiki/log.md` and fix this file ([resume procedure](wiki/operations/ops-resume-after-interruption.md)).
> `sources`/`related` paths in the frontmatter are relative to `wiki/` (SCHEMA §5.1).

## Current phase

**phase-p1-foundation — IN PROGRESS (session s02, started 2026-10-11).** The owner gave the go-ahead in chat on
2026-10-11 ([raw/owner/2026-10-11-s02-p1-go-ahead.md](wiki/raw/owner/2026-10-11-s02-p1-go-ahead.md)): "Start phase 1
please", aiming to finish P1 in this session. Standing rule from the same message: **no kill commands and no deleting of
things Claude did not create; ask the owner first.** The entry gate passed (log entry of 2026-10-11, 12:25).

P0 (planning) is done and signed off (2026-10-11, `phase-p0-planning#exit` APPROVED after the P0 gate passed on `b5f7d40`).

## Done this session (s02)

- Session start; go-ahead transcribed; P1 entry gate passed; `phase-p1-foundation` set to in-progress.
- p1.1 done (`29b7d81`): toolchain recorded ([toolchain.txt](wiki/raw/evidence/phase-p1-foundation/toolchain.txt), [toolchain-details.txt](wiki/raw/evidence/phase-p1-foundation/toolchain-details.txt)); cargo-deny 0.20.2 installed; cargo uses the MSVC linker.
- p1.2 done (`c0142a5`): machine inventory saved ([environment.md](wiki/raw/evidence/phase-p1-foundation/environment.md)); Q-116 and Q-122 still open for the owner.
- p1.3 done (`e4a193a`): ignore rules, `.gitattributes`, LICENSE-MIT, LICENSE-APACHE, README licence section.
- p1.4 done (`de68d66`): Cargo workspace with six library stubs, rust-toolchain 1.99.0, section-12 folders; build/test/fmt/clippy clean.
- p1.17 done (`135d6cc`): spikes pinned to tauri 2.12.3, @tauri-apps/cli 2.12.2, @tauri-apps/api 2.12.3, vite 8.3.4, typescript 7.0.2.
- p1.5 automatic part (`331e3f6`): spike S1 built; all automatic checks pass; sync deadlock reproduced; Job Object holds all WebView2 processes. Owner hand checks pending.
- p1.7 done (`3e30f93`): spike S3 raw COM, every call S_OK; one webview2-com and one windows version; unsafe invariants drafted.
- p1.8 done (`c4dfd4d`): spike S4, one Playwright harness drives S1, Chrome for Testing and Edge over CDP; hidden tabs give no paint or screenshot.
- p1.6 done (`f7004a9`, fix `809cd3c`): spike S2, route (c) per-site profiles in one browser process with isolated cookies; route (d) works with a browser per site; (a) unreleased, (b) not run.
- p1.10 done (`60c7d03`): git-backed lint rules re-confirmed (13 tests, 0 wiki errors, 106 fingerprints match).
- p1.12 done (`04d9f8c`): deny.toml, cargo deny ok; npm audit dispositioned; new question Q-222 (MPL-2.0 licence, blocks P2).
- p1.13 done (`3b24c12`): SECURITY.md, BENCHMARKING.md, REPRODUCIBILITY.md, docs/README.md; AI_USAGE.md updated.
- p1.15 hook committed (`898fd14`): warns on code without its page; clone test passes; SCHEMA §9.8 tag closed at the exit gate.
- p1.11 committed (`5b6113c`): ci.yml and scripts/ci-local.ps1; local run 14 of 14 PASS; owner pushes or defers GitHub.

## Done this session (s01)

- Scoping Q&A with the owner recorded in [wiki/raw/01-scoping-decisions.md](wiki/raw/01-scoping-decisions.md);
  master prompt stored verbatim in [wiki/raw/00-master-prompt.md](wiki/raw/00-master-prompt.md).
- `git init -b main` performed; the owner authorised local commits (Q-104, 2026-10-08); first commits
  `496f69d` (planning wiki, schema, raw sources) and `48c90d8` (`.gitattributes`, LF endings).
- Five research notes in `wiki/raw/research/`; schema layer (`wiki/SCHEMA.md`, `CLAUDE.md`, this file).
- Multi-agent drafting of every wiki area (p0.4–p0.7), a review pass (52 issues raised, fixed by the
  area agents) and a completeness critic pass (23 gaps).
- Integration (p0.7, finished): SCHEMA amendment batch applied; open-questions register reconciled
  (Q-101 answered by directives 2 and 4; Q-208–Q-217 added); approval waves defined
  ([ops-approval-workflow §8](wiki/operations/ops-approval-workflow.md#8-approval-waves)); phase, ADR,
  risk, research and plan-app pages fixed; [wiki/index.md](wiki/index.md) and [wiki/log.md](wiki/log.md)
  created; integration lint (PyYAML-based, scratchpad) reports **0 errors, 0 warnings** over 191 files
  with frontmatter plus 3 raw files without it, and the quick lint embedded in ops-wiki-maintenance §5 also
  reports 0 errors. Details: the last entries of `wiki/log.md`.
- New raw evidence: [env-webview2-pv.txt](wiki/raw/evidence/phase-p0-planning/env-webview2-pv.txt)
  (WebView2 runtime `pv` 154.0.4258.62).
- Ingest of the Wave 0 owner answers ([raw/owner/2026-10-08-s01-wave0.md](wiki/raw/owner/2026-10-08-s01-wave0.md)):
  Q-006, Q-007, Q-102, Q-103, Q-104, Q-210 answered; new Q-218 (CONTRADICTION on adr-0005, installs).
- p0.9 / IP-0 done (commit `1cfc2d5`): Node v24.20.0, npm 11.19.0, git 2.52.0.windows.1; gate PASS
  ([IP-0-toolchain.txt](wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-0-toolchain.txt)).
- p0.10 / IP-1 done (commit `2c997fa`): `interactive_plan/` scaffolded with create-next-app 16.4.0, the ip-spec §7
  stack pinned exactly (no peer errors), coverage-v8 + Playwright Chromium installed (Q-210); spikes S1 (fs outside the
  root), S2 (mermaid 12.1.0) and S3 (127.0.0.1-only bind) pass under `next start` and `next dev`; gate typecheck + lint +
  build green ([IP-1-scaffold.txt](wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-1-scaffold.txt),
  [IP-1-spikes.txt](wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-1-spikes.txt)).
- Wave 0b ingested (commit `a68667b`, [raw/owner/2026-10-08-s01-wave0b.md](wiki/raw/owner/2026-10-08-s01-wave0b.md)):
  Q-216 (scripts committed as `tools/quick_lint.py` and `tools/approvals_check.py` with stdlib tests),
  Q-218 ([adr-0021](wiki/decisions/adr-0021-claude-runs-toolchain-installs.md): Claude runs all toolchain
  installs, owner clicks UAC, drivers need separate approval; supersedes adr-0005) and Q-219
  ([adr-0020](wiki/decisions/adr-0020-index-lists-evidence-folders.md): index lists evidence/bench folders;
  SCHEMA §11 changed). Quick lint 0 errors, 27 tool tests OK
  ([tools-wave0b-check.txt](wiki/raw/evidence/phase-p0-planning/tools-wave0b-check.txt)).
- Wave 0c ingested (2026-10-09, [raw/owner/2026-10-09-s01-wave0c.md](wiki/raw/owner/2026-10-09-s01-wave0c.md)): `sources`
  may be any wiki-relative path or https URL (SCHEMA §5.1, Q-220), raw research notes exempt, real-wiki loader test in
  `npm run lint:wiki`, `tools/quick_lint.py` exits 1 on errors, typecheck = `next typegen && tsc --noEmit`, npm audit
  accepted until the P0 exit recheck, stale "owner installs Node" wording removed from adr-0016/ip-build-plan/ip-spec;
  IP-1-settled tags turned into evidence citations. Standing delegation policy: Claude decides tooling/schema/lint
  consistency questions and logs them; scope, product behaviour, security posture, methodology, cost and deletion
  still go to the owner.
- p0.11 / IP-2 done: `lib/config.ts`, `lib/wiki/*` loader + zod schemas, fixtures, 477 unit tests + 6 real-wiki tests
  green, typecheck + eslint exit 0 ([IP-2-tests.txt](wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-2-tests.txt)).
- p0.12 / IP-3 done: `lib/approvals/{hash,model,state,diff}.ts` and `lib/wiki/gates.ts`; loader fills content/scope/bootstrap
  hashes; hash vectors v01-v15 (v11-v15 new, computed by the SCHEMA §10.2 Python block) and the Python cross-check (15 vectors +
  401 generated inputs) agree; 571 unit tests, lint:wiki, typecheck, eslint, quick lint and 29 tool tests green
  ([IP-3-tests.txt](wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-3-tests.txt)). Delegated details in the `decide` log entry
  of 2026-10-09 (bootstrap_hash fail-closed, also in tools/approvals_check.py; entry-gate step 4 added to ip-data-contract §8.3).
- p0.14 / IP-4 done (commit `6cc1a07`): `lib/approvals/{store,lock,guard,logAppend,view,file,errors,time,api}.ts` and
  `app/api/approvals/route.ts`; 670 unit tests incl. the store, guard and route suites (every ip-approvals-api §2.2 code reached);
  the cross-process test (4 node processes x 10 submits + a concurrent reader) green in the full run and 3 more times in a row;
  lint:wiki, typecheck, eslint, quick lint, 29 tool tests green; plan/approvals.json untouched
  ([IP-4-tests.txt](wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-4-tests.txt)). Windows refuses a rename over an open
  file (EPERM, observed); the retry budget is 6 attempts (20-320 ms backoff). Delegated details in the IP-4 `decide` log entry.
- p0.13 / IP-5 done (commit `19b5a95`, wording fix `84ba8ff`): `lib/lint/` (all ip-wiki-lint §2/§2.1 rules, SCHEMA §9.3
  Q-BLOCK-UNGATED and PHASE-DONE-NO-EXIT, git-backed STALE-UPDATED and RAW-IMMUTABLE), `npm run lint:wiki`, `lint:wiki:json`
  and `gate`; golden rule tests, git tests on a temp repository, Python parity; 701 unit tests, typecheck, eslint, quick lint,
  29 tool tests green. Real wiki: 0 errors, 34 warnings with dispositions in the IP-5 `lint` log entry
  ([IP-5-gate.txt](wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-5-gate.txt),
  [IP-5-lint.json](wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-5-lint.json)). Delegated details in the IP-5 `decide`
  log entry (tags in inline code count, log.md exempt from UNV-PASTDUE/MIRROR, vitest reporter settings).
- p0.13 / IP-6 done (commit `ad521cc`): app shell (top bar, banners, three-state theme toggle with pre-paint script, light/dark
  tokens, system fonts), `Markdown` (raw HTML shown as text) and `Mermaid` (strict, re-themed, page-linked nodes), `/wiki`,
  `/wiki/[[...path]]`, `/go/[id]`, `/search`, `/log`, 404 with close matches; 773 unit/component tests, Playwright
  wiki/log/theme/views 44 passed against a temp copy under a path with a space, typecheck, eslint, lint:wiki (0 errors),
  quick lint, 29 tool tests green ([IP-6-tests.txt](wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-6-tests.txt)).
  Delegated details in the IP-6 `decide` log entry (ApproveBar tests move to IP-7, E2E overlay fixture, /go targets).
  Integrator item: a `;` in a sequence-diagram message on `ov-arch-data-flows` breaks that mermaid diagram (see the entry).
- p0.15 / IP-7 done (commit `a462a9f`): dashboard `/`, `/approvals` inbox (tabs, current wave, grouping by phase, review mode
  j/k, orphans, no bulk approve), `/phases/[id]` (entry gate, tasks, test gate evidence ✓/✗, page and exit approve bars), the
  `ApproveBar` client component (also on approvable `/wiki` pages) and `/lint`; 801 unit/component tests, Playwright 71 passed
  incl. dashboard, approval-flow, approval-race and exit-approval, guard: real approvals.json absent and log.md/STATUS.md unchanged;
  typecheck, eslint, lint:wiki (0 errors), quick lint, 29 tool tests green
  ([IP-7-tests.txt](wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-7-tests.txt)). Delegated details in the IP-7 `decide`
  log entry (eligible exit keys, Stale tab, wave/grouping rules, evidence paths, E2E isolation).
- p0.13 / IP-8 done (commit `4fa5ea5`): `/architecture` (xyflow component graph in trust-level lanes, TB edges marked,
  TRUST-EDGE red, side panel, edge table), `/roadmap` (phase DAG + critical path, SVG timeline in sessions, per-phase table),
  `/decisions` + `/decisions/[id]`, `/risks` (heatmap table + sortable register), `/research` (traceability graph, gaps, rq filter,
  nested list); ADR ids now open `/decisions/<id>`; all nav entries enabled; 827 unit tests (24 graph tests), Playwright 100
  passed, guard unchanged; lint:wiki 0 errors (new real-wiki graph test: 9 phases, 49 sessions)
  ([IP-8-tests.txt](wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-8-tests.txt)). The first gate run exposed a Windows
  lock race in the IP-4 store (raw EPERM on `.approvals.lock`); fixed (busy-retry until LOCK_TIMEOUT) and re-run green. Delegated
  details in the IP-8 `decide` log entry. Integrator item: `exp-reliability` has `trials.target` 10 (< 30).
- p0.16 / IP-9 done (commit `0e5282e`): `a11y.spec.ts` (landmarks, one h1, skip link, named controls on 16 routes; keyboard-only approve bar,
  graph nodes, theme), `security.spec.ts` (guard refusals, a second `PLAN_READONLY=1` server on 3419, loopback-only bind probe
  with a control listener: 13 non-loopback addresses refused), coverage thresholds enforced in `vitest.config.mts`, `npm run perf`;
  `npm run verify` green in one run (830 unit, lint:wiki 0 errors, 131 E2E) and `npm run test:coverage` thresholds met
  ([IP-9-verify.txt](wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-9-verify.txt),
  [playwright-report.zip](wiki/raw/evidence/phase-p0-planning/interactive-plan/playwright-report.zip)). Timing on the real wiki
  (app evidence only, [IP-9-perf.txt](wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-9-perf.txt)): warm medians
  27-178 ms, under the 500 ms target; the first request (about 2.2 s) and requests after the 10 s lint memo expires (1.0-1.4 s)
  miss it (owner question in the IP-9 log entries). Delegated details in the IP-9 `decide` log entry.
- p0.16 / IP-9 review fixes done (commit `6a78a78`): 26 reviewer findings, 25 fixed and 1 environmental (no change). Every
  route sends `X-Frame-Options: DENY` and a same-origin CSP and refuses a non-loopback `Host` (`proxy.ts`); server scripts run
  `scripts/serve.mjs` (127.0.0.1, `PLAN_PORT`); CLAUDE.md shown on the schema page, STATUS "Next action" section on the
  dashboard, inbox diffs; APPROVAL-INVALID is a lint error (SCHEMA §9.3,
  [adr-0022](wiki/decisions/adr-0022-approval-invalid-is-a-lint-error.md), claude-proposed), ADR-CHAIN/PHASE-ORDER/MERMAID-RULES
  tightened, approvals_check `#exit` fix; graph, mermaid, phone-width and log fixes; `npm run verify` exit 0 (869 unit,
  lint:wiki 0 errors, 143 E2E), coverage thresholds met
  ([IP-9-review-fixes.txt](wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-9-review-fixes.txt)). Details: the IP-9
  review `decide`, `schema` and `code` log entries.
- p0.16 / IP-10 done (commit `6118d32`): `interactive_plan/README.md` (start `npm run dev:local` -> http://127.0.0.1:3417, scripts table, environment
  variables, approvals rule, spec links, known issues); the seven `ip-*` pages `status: active`; the ip-spec §5 perf tag kept with a
  logged reason and an IP-9-perf.txt citation; final `npm run lint:wiki` 0 errors, 34 warnings, 2 info
  ([IP-10-final-lint.json](wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-10-final-lint.json)); handoff
  [handoff-2026-10-09-s01](wiki/operations/handoffs/handoff-2026-10-09-s01.md). Details: the IP-10 log entries.
- p0.16 / IP-10 follow-up done (commits `3eaa641`, `62e5936`): `/architecture` edge-label overlap fixed (canvas chips of at most 24
  characters placed with no chip/chip or chip/node overlap, full text of the active component's edges in a list beside the graph,
  dagre reserves chip space); new `architecture-real.spec` on a read-only real-wiki server (3420) asserts no overlaps on hover of
  WebView manager and that the list names all its edges; `npm run verify` exit 0 in one run (873 unit, lint:wiki 0 errors, 144 E2E)
  ([IP-10-arch-labels-fix.txt](wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-10-arch-labels-fix.txt));
  `comp-interactive-plan` implemented with `last_verified_commit` `3eaa641`; ip-spec §5 cold-request misses accepted as a local-tool
  limitation; IP-0-toolchain.txt and IP-9-review-fixes.txt working copies restored from git (MANIFEST 33/33 under SCHEMA N).
- p0.17 step "rules" done (commit `5d33859`): the owner's portal-v2 decisions are now written rules. Approvals are given in
  Claude Code and recorded by Claude with fingerprints ([adr-0023](wiki/decisions/adr-0023-approvals-in-claude-code-portal-read-only.md),
  supersedes adr-0016; `tools/approvals_record.py`); the portal is read-only and will read plain-language JSON
  ([adr-0024](wiki/decisions/adr-0024-portal-reads-plain-language-json.md)); check scripts are PowerShell 7
  ([adr-0025](wiki/decisions/adr-0025-check-scripts-powershell-7.md)); architecture in four groups
  ([adr-0026](wiki/decisions/adr-0026-architecture-four-groups.md)); real machine values masked
  ([adr-0027](wiki/decisions/adr-0027-mask-sensitive-values.md), `tools/mask.ps1`, gitignored `.env.local-map`). 16 committed
  evidence files masked as a sanctioned raw edit. Checks: quick lint 0 errors, lint:wiki 0 errors, mask scan 0 unmasked
  ([p0.17-rules-checks.txt](wiki/raw/evidence/phase-p0-planning/p0.17-rules-checks.txt)).
- p0.17 step "pipeline" done (commit `8d89329`): wiki changes now have a plain-language JSON copy for the portal, kept in
  step by three layers ([ops-portal-pipeline](wiki/operations/ops-portal-pipeline.md), adr-0024): the repo skill
  `.claude/skills/wiki-to-portal/` (how to translate, plain-language style guide), shapes in `plan/portal/schema/` with rules
  in `plan/portal/pipeline.json`, the checker `pwsh tools/portal-sync-check.ps1` (outdated, missing, badly shaped or
  unexplained-id text), and a Stop hook in `.claude/settings.json`, **installed switched off** until
  `plan/portal/.hook-enabled` exists. Check-script folders: `scripts/verify/`, `scripts/gates/`. Checks: 20 checker tests pass,
  quick lint 0 errors, lint:wiki 0 errors, mask scan 0 unmasked
  ([p0.17-pipeline-checks.txt](wiki/raw/evidence/phase-p0-planning/p0.17-pipeline-checks.txt)).
- p0.17 step "content" done (commit `ed8b89c`): the plain-language portal text exists for every page. One file per portal tab in
  `plan/portal/` (overview, roadmap, 9 phase files, decisions, risks, research, architecture, questions, log) plus
  `refs.json` with 374 explainers so every id opens a popup; written by six parallel writers, merged and read through
  once as the owner would. Check-script fields stay empty (`null`) until the scripts exist. Stale approval wording fixed
  on phase-p0-planning, phase-p1-foundation, risk-r22 and adr-0001 (approvals are given in Claude Code, adr-0023).
  The end-of-turn check is **switched on** (`plan/portal/.hook-enabled`). Checks: portal check clean, quick lint 0 errors,
  lint:wiki 0 errors, mask scan 0 unmasked
  ([p0.17-content-checks.txt](wiki/raw/evidence/phase-p0-planning/p0.17-content-checks.txt)).
- p0.17 step "scripts" done (commit `adc3651`): a PowerShell 7 check script for every task (`scripts/verify/`, 141) and
  every phase gate (`scripts/gates/`, 9), a shared module (`scripts/lib/Ferrum.Check.psm1`: PASS, FAIL, WAIT, TODO, YOURS;
  exit 0/1/2; masked evidence), `scripts/run-all-checks.ps1 -Phase P<N>` and `scripts/test-check-scripts.ps1`. P0 and P1
  scripts are real, P2-P8 are drafts ("not ready until P<n>"); the phase JSON names every script
  ([ops-portal-pipeline §7](wiki/operations/ops-portal-pipeline.md#7-check-scripts-written-in-task-p017-2026-10-09)).
  Checks: P0 gate PASS in one run (262 s); P1 gate FAIL as expected before P1 (p1.1 passes every installed tool and
  fails only on cargo-deny and the unsaved toolchain record); script test PASS; portal check clean; lint:wiki 0 errors;
  mask scan 0 unmasked ([p0.17-scripts-checks.txt](wiki/raw/evidence/phase-p0-planning/p0.17-scripts-checks.txt)).
- p0.17 step "portal-data-shell" done (commit `673cbdc`): `interactive_plan/` is now the **read-only portal**. The wiki browser, search,
  lint view, approvals inbox, approve bar and `POST /api/approvals` are removed (git history keeps them); the wiki check
  (`npm run lint:wiki`, `npm run gate`) stays as a command-line tool. New: zod schemas generated from
  `plan/portal/schema/` (a test keeps them in step; PowerShell Test-Json agrees on every case), the Layout-A shell of the
  Main mockup with self-hosted IBM Plex fonts, one reference popup for every id, the Overview and the phase popup; the
  six other tabs show a placeholder until the next step. Every route refuses non-loopback Hosts and any method other than
  GET and HEAD. Checks: `npm run verify` exit 0 (708 unit, 28 browser tests), P0 gate PASS, portal check clean, mask scan
  0 unmasked ([p0.17-portal-shell-checks.txt](wiki/raw/evidence/phase-p0-planning/p0.17-portal-shell-checks.txt)).
- p0.17 step "portal-views" done (commit `dfe164f`): the six remaining tabs of the read-only portal follow the approved mockups. Roadmap
  (three stages, one compact row per phase, "Same in every phase"), Architecture (layered diagram of the Rust app built
  from plain boxes, four-group switcher, part cards with what each talks to), Decisions (popup per decision, replaced ones
  muted, plus the risks highest first), Research (short sections, popup per item), Questions (open first) and Log (done,
  next, decisions, approvals, commit; filter). The phase popups now live in the layout, so every tab and every phase id
  opens them; a script popup shows the real check script through `GET /api/script`, which serves only scripts the
  portal JSON names (adr-0024 elaboration). Checks: `npm run verify` exit 0 (727 unit, 69 browser tests including axe
  on every tab in both themes), P0 gate, portal check clean, mask scan 0 unmasked
  ([p0.17-portal-views-checks.txt](wiki/raw/evidence/phase-p0-planning/p0.17-portal-views-checks.txt)).
- p0.17 step "portal-verify" done (commit `ef5dcc5`): final review of portal v2. Screenshots of every tab and popup at 1440 and 390 pixels
  were compared with the mockups and five visual defects fixed (duplicate chip, punctuation wrapping, architecture card
  names, glance cards, phone-width task table and gate header). New `scripts/start-portal.ps1` starts the portal in one
  step (README explains it). The `ip-*` pages and comp-interactive-plan now describe v2; `ip-approvals-api` and
  `ip-build-plan` are retired history (not approvable). Checks: `npm run verify` exit 0, P0 gate PASS, portal check
  clean, quick lint and lint:wiki 0 errors, mask scan 0 unmasked
  ([portal-verify.txt](wiki/raw/evidence/phase-p0-planning/portal-v2/portal-verify.txt)).
- p0.17 step "fix" done (commit `10c7829`, review fixes for portal v2): 30 review findings checked, 29 fixed, 1 rejected (withdrawn
  questions already link to their replacement). One "Questions for you" list (the four first-wave questions) drives the
  Overview row, the list and the tab badge; every task has a state; popups show titles and short names, never internal
  slugs; a decision shows one plain standing; parts that are not ours say "Used from"; Architecture follows the mockup
  (diagram plus "How to read this", connections in each part's popup); the Overview's start script opens in the script
  popup. The portal check now also compares copies with their records (MISMATCH) and takes about 2.3 s; every check
  script ends its header with a "For Claude" field and uses plain words before it. Q-008 corrected (the accessibility
  checker was added before the owner answered). Checks: `npm run verify` exit 0, P0 gate PASS, portal check clean, mask scan 0
  unmasked ([review-fixes.txt](wiki/raw/evidence/phase-p0-planning/portal-v2/review-fixes.txt)). Details: the log entries of this step.
- p0.17 step "handoff" done (commit `3991339`): the end-of-turn check (Stop hook) is on and proven: it passes on the clean repo and blocks (exit 2)
  when STATUS changes without its portal text. CLAUDE.md now opens with §0 "Working with the owner" (plain words, thought
  chains, the four-part format for anything he runs, he works in Claude Code only, how to start the portal), and §7/§8 say
  wiki edit ⇒ portal edit and approvals given in chat are recorded by Claude. Handoff
  [handoff-2026-10-09-s01](wiki/operations/handoffs/handoff-2026-10-09-s01.md) rewritten for portal v2. Checks: P0 gate PASS,
  portal check clean, quick lint and lint:wiki 0 errors, mask scan 0 unmasked
  ([handoff-checks.txt](wiki/raw/evidence/phase-p0-planning/portal-v2/handoff-checks.txt)).
- p0.17 step "q008-pause" done (commit `bc72c17`, 2026-10-10): the owner's chat words are ingested
  ([raw/owner/2026-10-10-s01-q008-and-pause.md](wiki/raw/owner/2026-10-10-s01-q008-and-pause.md)). Q-008 answered: keep
  the accessibility checker (after asking why: "Okay, lets add."). Standing directive: "Make sure to pause when completing
  the planning phase and before building the next phase". The pause rule is now in CLAUDE.md §1, SCHEMA §9.7 (exit-gate
  step 7), ops-session-protocol, adr-0014, the P0 exit task and the P1 entry criteria: when a phase's gate passes Claude
  stops, reports and waits for the owner's sign-off **and** an explicit go-ahead before any work of the next phase.
- 2026-10-11: owner answered Q-207, Q-004, Q-005, Q-108, Q-106, Q-110, Q-211; approved Waves 1 and 2 (30 keys);
  P0 gate run 1 failed on one unreadable MANIFEST line (fixed by appending), run 2 passed on `b5f7d40`; P0 signed off
  and set to done; Claude paused before P1 (owner: "don't start phase 1").
- 2026-10-11 P0 finish-up (commits `5de4b44`, `1b4ad02`; owner: "update everything well", P1 in a fresh session): the full wiki check
  showed 12 errors that appear only once P0 is done; fixed (`current_task` null; eight past-due planning claims closed with
  evidence or withdrawn; risk-r22 line endings checked: [r22-eol-check.txt](wiki/raw/evidence/phase-p0-planning/r22-eol-check.txt)).
  The planning page edit staled its approval and sign-off; the owner re-approved both
  ([raw/owner/2026-10-11-s01-p0-finishup-reapproval.md](wiki/raw/owner/2026-10-11-s01-p0-finishup-reapproval.md)).
- p0.8 done (commit `04b27b9`): quick lint + integration lint 0 errors; manual checks and dispositions in
  [wiki-lint-manual.md](wiki/raw/evidence/phase-p0-planning/wiki-lint-manual.md);
  [wiki/raw/MANIFEST.sha256](wiki/raw/MANIFEST.sha256) created.

## In-flight

> Write-ahead record. Filled **before** a task touches files; cleared after it is verified and
> committed. Non-empty on session start = the previous session was interrupted mid-task.
> `STATUS.md`, `wiki/log.md` and `wiki/index.md` are bookkeeping paths and are implicitly touched.

- task: p1.5 (owner hand checks), p1.11 (GitHub push or defer) and p1.15 (SCHEMA line at the exit gate) wait; next p1.14 (not started)
- rollback: nothing uncommitted

## Blockers

| Blocker | Effect | Who | State (2026-10-08) |
|---|---|---|---|
| Owner answers to Approval Wave 0 (`ip-*` pages + adr-0016 approved in chat; Q-006, Q-007, Q-103, Q-210; Q-102 Node line) | Blocked building `interactive_plan/` (p0.9–p0.16) | Owner (chat) | **Resolved 2026-10-08**: transcribed in [wiki/raw/owner/2026-10-08-s01-wave0.md](wiki/raw/owner/2026-10-08-s01-wave0.md) and ingested |
| Node.js on PATH | Needed to scaffold/run `interactive_plan/` | Claude (workaround) | Node v24.20.0 is installed in `C:\Program Files\nodejs` but is **not on the default PATH** of the Claude Code Bash shell. Workaround: start every Bash call with `export PATH="/c/Program Files/nodejs:$PATH"`. Not blocking |
| Local commits (Q-104) | Recovery relied on STATUS + log only | Owner | **Resolved 2026-10-08**: yes, one local commit per verified task, never push |
| Who runs toolchain installs (Q-218; CONTRADICTION on adr-0005) | Held P1 entry | Owner | **Resolved 2026-10-08**: Claude runs all toolchain installs (adr-0021 supersedes adr-0005) |
| Index ids for upper-case evidence names (Q-219) | Quick lint reported 1 INDEX-MISSING error (IP-0-toolchain); paused the build before IP-1 | Owner | **Resolved 2026-10-08**: index lists evidence folders (adr-0020); quick lint 0 errors |
| `sources` format on the real wiki (found by the IP-2 loader) | Holds p0.11 / IP-2: the real-wiki loader test reports 4 FM-MISSING errors | Owner / integrator | **Resolved 2026-10-09** (wave 0c items 1-3, Q-220): any wiki-relative path or https URL; raw research notes exempt; IP-2 gate passed |
| Rust (rustup/cargo), MSVC Build Tools | Needed by P1 toolchain tasks; do not block P0 | Claude runs winget, owner clicks UAC (adr-0021) | **Installed** (observed 2026-10-09: Rust 1.99.0 stable-msvc, VS Build Tools 2022 17.14); versions are recorded as evidence in p1.1. cargo-deny not installed yet |
| Owner approvals | Every phase entry gate | Owner (in Claude Code), recorded by Claude (adr-0023) | **Waves 1 and 2 approved 2026-10-11** (30 keys) plus the P0 sign-off; all 31 APPROVED in `plan/approvals.json` (planning page and sign-off re-approved after the finish-up edit); Wave 3 is asked before P2 |
| **First push to GitHub** | Old commits still contain the real IP addresses and user-folder path that were masked on 2026-10-09 | Owner ([Q-221](wiki/overview/ov-open-questions.md#q-221-rewrite-git-history-before-the-first-push-to-remove-real-machine-values)) | Open — **blocks the first push**: Claude asks the owner to approve a history rewrite before anything is pushed (adr-0027) |

Exact install and verification commands: [wiki/operations/ops-environment-setup.md](wiki/operations/ops-environment-setup.md).

## Open questions

[ov-open-questions](wiki/overview/ov-open-questions.md): **33 open** (newest: Q-222, the MPL-2.0 licence), 19 answered (Q-004, Q-005, Q-006, Q-007,
Q-008, Q-101, Q-102, Q-103, Q-104, Q-106, Q-108, Q-110, Q-207, Q-210, Q-211, Q-216, Q-218, Q-219, Q-220), 3 withdrawn (Q-001–Q-003).
Answer them by wave, not all at once, in Claude Code ([ops-approval-workflow §8](wiki/operations/ops-approval-workflow.md#8-approval-waves)):

- **Wave 0 (before the plan app):** done 2026-10-08 ([raw/owner/2026-10-08-s01-wave0.md](wiki/raw/owner/2026-10-08-s01-wave0.md)).
- **Wave 1 (P0 exit):** done 2026-10-11 ([raw/owner/2026-10-11-s01-wave1-answers-and-p0-signoff.md](wiki/raw/owner/2026-10-11-s01-wave1-answers-and-p0-signoff.md)).
- **Wave 2 (P1 entry):** done 2026-10-11 ([raw/owner/2026-10-11-s01-wave2-answers.md](wiki/raw/owner/2026-10-11-s01-wave2-answers.md)).
- **Wave 3 (P2 entry, later):** Q-109, Q-202, Q-214. Q-125 (title bar) any time before P3. Q-221 before the first push.
- Later waves: see the "Summary by gate" table on the register.

## Next action

**1. Where we are**

| Item | State |
|---|---|
| Phase 1 | In progress: 11 of 17 tasks done |
| Next task | p1.14 start the literature review |
| Your rule this session | Claude asks before any delete or kill command |

**2. Why, and what it does.** Nothing for you to run now. Claude writes how the literature review is done and records a first batch of checked reading notes.

**3. The script:** none for you.

**4. What to tell Claude:** nothing; Claude asks when a step needs you.

## Pending owner approvals

Approval Waves 1 and 2 are approved (2026-10-11, 30 keys, recorded with `tools/approvals_record.py`; `python tools/approvals_check.py`
shows each APPROVED). Next is Wave 3 (the P2 dependency set), asked when the owner wants to move towards P2. The keys, wave by wave, are in
[ops-approval-workflow §8](wiki/operations/ops-approval-workflow.md#8-approval-waves). Pages outside every phase dependency set (risks,
metrics, workloads, hypotheses, research questions, narrative pages) never gate a phase and can be reviewed later.

## Last updated

2026-10-11, session s02 (P1 in progress: 11 of 17 tasks done; p1.5, p1.11 and p1.15 wait for the end-of-phase batch). Last handoff: [handoff-2026-10-09-s01](wiki/operations/handoffs/handoff-2026-10-09-s01.md) (updated 2026-10-11).
