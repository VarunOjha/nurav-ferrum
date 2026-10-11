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
related: [ops-portal-pipeline, adr-0023, adr-0024, adr-0025, adr-0026, adr-0027, phase-p0-planning, phase-p1-foundation, ops-approval-workflow, ip-build-plan, ops-session-protocol, ops-resume-after-interruption, ops-environment-setup, ops-multi-agent-workflow, ops-wiki-maintenance, ov-open-questions, schema]
approvable: false
session: s01
current_phase: phase-p0-planning
current_task: p0.17
next_action: "Owner: stop the running portal with Ctrl+C, then in PowerShell 7, from the repo folder, run pwsh -NoProfile -File scripts/start-portal.ps1 again (it rebuilds and opens http://127.0.0.1:3417/ with the Ref button, its fixes and the new eight-column tasks table with its review fixes, the browser design you chose, first under Architecture, with its review fixes: a readable close-up of the Ferrum panel on phones and the sample note right under the picture, and one list pattern on Log, Questions, Decisions, Risks and Research: cards that open on click with Open all, a Sort choice, search, filters, category and tag labels and page numbers; Questions start on the open ones, Risks are cards highest risk first, Research is one list of 70 with a Kind filter, with its review fixes). Read every tab and popup, including the P1 phase popup with its task check scripts and gate script. Then tell Claude in Claude Code what reads wrong or unclear, or \"the portal reads fine\"; for layout feedback turn on Ref and paste the copied block names. Claude fixes the wording, asks your first approvals in chat and records them, then asks your P0 sign-off. Then Claude PAUSES (your directive of 2026-10-10): P1 does not start until you explicitly say go."
blocked_on: []
last_handoff: handoff-2026-10-09-s01
---

# STATUS — live state (read this first every session)

> Updated after every completed task and at every handoff (SCHEMA §9.5). If git disagrees with this
> file, trust git + `wiki/log.md` and fix this file ([resume procedure](wiki/operations/ops-resume-after-interruption.md)).
> `sources`/`related` paths in the frontmatter are relative to `wiki/` (SCHEMA §5.1).

## Current phase

**phase-p0-planning — in progress (session s01, 2026-10-08).** Planning only. No Ferrum application code
(no Rust, no Tauri) may be written. The `interactive_plan/` Next.js app (owner directive 2 in
[raw/01-scoping-decisions.md](wiki/raw/01-scoping-decisions.md)) is the planning tool, not Ferrum code.

P0 state in one line: **the wiki is drafted, integrated and lint-clean (p0.8); Approval Wave 0 is answered
and transcribed; the `interactive_plan/` app is scaffolded (IP-1) and has its wiki loader (IP-2), its hash/state/gate modules (IP-3), its approvals store + API (IP-4), its wiki lint + gate report (IP-5; `npm run lint:wiki` is now the normative lint, real wiki 0 errors) and its app shell, wiki browser, search and log views (IP-6), its dashboard, approvals inbox, phase detail, approve bar and lint view (IP-7) its architecture, roadmap, decisions, risks and research views (IP-8) and its accessibility, security and timing checks with a green `npm run verify` and coverage thresholds (IP-9) and its README, final lint and handoff (IP-10, the app build is complete); p0.17 (portal v2, after the owner found v1 too technical) has its rules, its wiki-to-portal pipeline, the plain-language portal text for every page and a PowerShell 7 check script for every task and phase (the P0 gate passes), and the new read-only portal is built and reviewed: all seven tabs of the approved mockups with phase, detail, reference and script popups, started with one script; the session handoff is written and the end-of-turn check is proven on; nothing is approved in `plan/approvals.json`
yet (every approvable page is PENDING).**

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
- p0.8 done (commit `04b27b9`): quick lint + integration lint 0 errors; manual checks and dispositions in
  [wiki-lint-manual.md](wiki/raw/evidence/phase-p0-planning/wiki-lint-manual.md);
  [wiki/raw/MANIFEST.sha256](wiki/raw/MANIFEST.sha256) created.

## In-flight

> Write-ahead record. Filled **before** a task touches files; cleared after it is verified and
> committed. Non-empty on session start = the previous session was interrupted mid-task.
> `STATUS.md`, `wiki/log.md` and `wiki/index.md` are bookkeeping paths and are implicitly touched.

(empty: p0.17 step "lists-fixes" (review fixes for the one list pattern) verified and committed 2026-10-11 (`b2557e0`); next the owner restarts the portal and continues the walkthrough)

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
| Owner approvals | Every phase entry gate; `plan/approvals.json` does not exist | Owner (in Claude Code), recorded by Claude (adr-0023) | Pending — asked after portal v2 is built (p0.17), wave by wave |
| **First push to GitHub** | Old commits still contain the real IP addresses and user-folder path that were masked on 2026-10-09 | Owner ([Q-221](wiki/overview/ov-open-questions.md#q-221-rewrite-git-history-before-the-first-push-to-remove-real-machine-values)) | Open — **blocks the first push**: Claude asks the owner to approve a history rewrite before anything is pushed (adr-0027) |

Exact install and verification commands: [wiki/operations/ops-environment-setup.md](wiki/operations/ops-environment-setup.md).

## Open questions

[ov-open-questions](wiki/overview/ov-open-questions.md): **38 open** (newest: Q-221, history rewrite before the first push), 12 answered (Q-006, Q-007, Q-008, Q-101,
Q-102, Q-103, Q-104, Q-210, Q-216, Q-218, Q-219, Q-220), 3 withdrawn (Q-001–Q-003). Answer them by wave, not all at once, in Claude Code
([ops-approval-workflow §8](wiki/operations/ops-approval-workflow.md#8-approval-waves)):

- **Wave 0 (before the plan app):** done 2026-10-08 ([raw/owner/2026-10-08-s01-wave0.md](wiki/raw/owner/2026-10-08-s01-wave0.md)).
- **Wave 1 (P0 exit):** Q-207 and Q-004 (closed by approving `schema`), Q-005, Q-108.
- **Wave 2 (P1 entry):** Q-106, Q-110, Q-211 (Q-218 answered 2026-10-08, adr-0021).
- Later waves: see the "Summary by gate" table on the register.

## Next action

**1. Where we are**

| Item | State |
|---|---|
| Plan portal (portal v2) | Built, reviewed and checked: seven tabs, popups for every id, read-only; new Ref button names every block for your layout feedback (restart the portal to get it) |
| Check scripts | One per task and per phase; the P0 checks all pass; the P1 scripts are ready for your review |
| End-of-turn check | On: Claude cannot end a turn while the portal text is out of date |
| Approvals | None yet; you give them in Claude Code, Claude records them |
| After your P0 sign-off | Claude pauses; P1 starts only when you say go (your rule of 10 Oct) |
| First upload to GitHub | On hold until you answer the history-rewrite question (Q-221) |

**2. Why, and what it does.** The portal is how you follow the project → you read it once end to end, including
the P1 task and gate scripts → Claude fixes whatever reads unclear → then asks your first approvals in chat → your
P0 sign-off closes the planning phase → Claude then pauses, and P1 starts only when you explicitly say go. The script only starts the portal; it changes nothing in
the plan.

**3. The script** (PowerShell 7, from the repo folder):

```powershell
pwsh -NoProfile -File scripts/start-portal.ps1
```

- `pwsh -NoProfile` runs PowerShell 7 without your personal settings, so it behaves the same every time.
- `scripts/start-portal.ps1` finds Node, installs the portal's packages the first time, builds the portal (about a
  minute), starts it on this computer only (127.0.0.1) and opens http://127.0.0.1:3417/ in your browser.
- Ctrl+C stops it. If the portal is already running, stop it with Ctrl+C and run the script again: it rebuilds, so
  you get the new **Ref** button.

What to read: every tab; on the Roadmap, open P1 and read its tasks, the check script of each task (script button)
and the gate script that decides when P1 is done.

For layout feedback, click **Ref** in the top bar: every block gets an outline and a name such as
"OV-3 · What happens next"; click a name to copy it and paste it into your message. Esc turns it off.

**4. What to tell Claude afterwards:** "the portal reads fine", or which tab or popup reads wrong or unclear and
why (for layout, with the names Ref mode copied).

Then, in order:

1. Claude fixes the wording you named (wiki and portal together).
2. Claude asks the first-wave approvals and questions in chat (Q-207, Q-004, Q-005, Q-108) and records each answer
   with `tools/approvals_record.py` ([ops-approval-workflow](wiki/operations/ops-approval-workflow.md)).
3. Task p0.18 (P0 exit review): Claude re-runs `npm audit` in `interactive_plan/`, runs the P0 gate
   (`pwsh -NoProfile -File scripts/gates/p0-gate.ps1`), then asks for your **P0 sign-off** in Claude Code.
4. **PAUSE.** After your P0 sign-off Claude stops, reports, and waits. P1 does not start (no task, install or
   project setup) until you explicitly say go in Claude Code; Claude records your words
   ([your directive of 2026-10-10](wiki/raw/owner/2026-10-10-s01-q008-and-pause.md), SCHEMA §9.7 exit-gate step 7).
5. Before the first push (any time later): Claude asks Q-221 (history rewrite); no push until answered.

Still open for you (no action needed now): 5 known warnings in
development-only tools, re-checked before P0 sign-off; one line-ending safety claim (risk-r22) still needs its own
small check.

## Pending owner approvals

Nothing is approved yet. Every approvable page is **PENDING**. Approvals are given in Claude Code and recorded by
Claude (adr-0023). The keys to approve, wave by wave, are in
[ops-approval-workflow §8](wiki/operations/ops-approval-workflow.md#8-approval-waves). Pages outside every
phase dependency set (risks, metrics, workloads, hypotheses, research questions, narrative pages) never
gate a phase and can be reviewed later.

## Last updated

2026-10-10, session s01 (p0.17 step "q008-pause": Q-008 answered (keep the accessibility checker) and the pause-between-phases rule recorded; next: your walkthrough of the portal). Last handoff: [handoff-2026-10-09-s01](wiki/operations/handoffs/handoff-2026-10-09-s01.md).
