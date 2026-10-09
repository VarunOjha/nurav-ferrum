---
id: status-live
type: status
title: "Ferrum live status and next action"
status: awaiting-owner
updated: 2026-10-09
sources:
  - raw/01-scoping-decisions.md
  - raw/research/nextjs-stack.md
  - raw/owner/2026-10-08-s01-wave0b.md
  - raw/owner/2026-10-09-s01-wave0c.md
related: [phase-p0-planning, phase-p1-foundation, ops-approval-workflow, ip-build-plan, ops-session-protocol, ops-resume-after-interruption, ops-environment-setup, ops-multi-agent-workflow, ops-wiki-maintenance, ov-open-questions, schema]
approvable: false
session: s01
current_phase: phase-p0-planning
current_task: p0.14
next_action: "p0.14 / IP-4 of ip-build-plan: write interactive_plan/lib/approvals/store.ts, lock.ts, the guard and app/api/approvals/route.ts (ip-approvals-api), plus the optional log append and the snapshot write (ip-testing §1.4 Snapshots); run ip-testing §1.4 and §1.5 incl. the cross-process test 3 times in a row, save IP-4-tests.txt and commit [p0.14]. Tests must only use temp data dirs; never write plan/approvals.json. Node: export PATH=\"/c/Program Files/nodejs:$PATH\"."
blocked_on: []
last_handoff: null
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
and transcribed; the `interactive_plan/` app is scaffolded (IP-1) and has its wiki loader (IP-2) and its hash/state/gate modules (IP-3), IP-4 to IP-10 remain; nothing is approved in `plan/approvals.json`
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
- p0.8 done (commit `04b27b9`): quick lint + integration lint 0 errors; manual checks and dispositions in
  [wiki-lint-manual.md](wiki/raw/evidence/phase-p0-planning/wiki-lint-manual.md);
  [wiki/raw/MANIFEST.sha256](wiki/raw/MANIFEST.sha256) created.

## In-flight

> Write-ahead record. Filled **before** a task touches files; cleared after it is verified and
> committed. Non-empty on session start = the previous session was interrupted mid-task.
> `STATUS.md`, `wiki/log.md` and `wiki/index.md` are bookkeeping paths and are implicitly touched.

(empty: p0.12 / IP-3 verified and committed 2026-10-09)

## Blockers

| Blocker | Effect | Who | State (2026-10-08) |
|---|---|---|---|
| Owner answers to Approval Wave 0 (`ip-*` pages + adr-0016 approved in chat; Q-006, Q-007, Q-103, Q-210; Q-102 Node line) | Blocked building `interactive_plan/` (p0.9–p0.16) | Owner (chat) | **Resolved 2026-10-08**: transcribed in [wiki/raw/owner/2026-10-08-s01-wave0.md](wiki/raw/owner/2026-10-08-s01-wave0.md) and ingested |
| Node.js on PATH | Needed to scaffold/run `interactive_plan/` | Claude (workaround) | Node v24.20.0 is installed in `C:\Program Files\nodejs` but is **not on the default PATH** of the Claude Code Bash shell. Workaround: start every Bash call with `export PATH="/c/Program Files/nodejs:$PATH"`. Not blocking |
| Local commits (Q-104) | Recovery relied on STATUS + log only | Owner | **Resolved 2026-10-08**: yes, one local commit per verified task, never push |
| Who runs toolchain installs (Q-218; CONTRADICTION on adr-0005) | Held P1 entry | Owner | **Resolved 2026-10-08**: Claude runs all toolchain installs (adr-0021 supersedes adr-0005) |
| Index ids for upper-case evidence names (Q-219) | Quick lint reported 1 INDEX-MISSING error (IP-0-toolchain); paused the build before IP-1 | Owner | **Resolved 2026-10-08**: index lists evidence folders (adr-0020); quick lint 0 errors |
| `sources` format on the real wiki (found by the IP-2 loader) | Holds p0.11 / IP-2: the real-wiki loader test reports 4 FM-MISSING errors | Owner / integrator | **Resolved 2026-10-09** (wave 0c items 1-3, Q-220): any wiki-relative path or https URL; raw research notes exempt; IP-2 gate passed |
| Rust (rustup/cargo), MSVC Build Tools | Block P1 toolchain tasks; do not block P0 | Claude runs winget, owner clicks UAC (adr-0021) | Not installed |
| Owner approvals | Every phase entry gate; `plan/approvals.json` does not exist | Owner (plan app) | Pending — plan app not built yet |

Exact install and verification commands: [wiki/operations/ops-environment-setup.md](wiki/operations/ops-environment-setup.md).

## Open questions

[ov-open-questions](wiki/overview/ov-open-questions.md): **38 open**, 11 answered (Q-006, Q-007, Q-101,
Q-102, Q-103, Q-104, Q-210, Q-216, Q-218, Q-219, Q-220), 3 withdrawn (Q-001–Q-003). Answer them by wave, not all at once
([ops-approval-workflow §8](wiki/operations/ops-approval-workflow.md#8-approval-waves)):

- **Wave 0 (before the plan app):** done 2026-10-08 ([raw/owner/2026-10-08-s01-wave0.md](wiki/raw/owner/2026-10-08-s01-wave0.md)).
- **Wave 1 (P0 exit):** Q-207 and Q-004 (closed by approving `schema`), Q-005, Q-108.
- **Wave 2 (P1 entry):** Q-106, Q-110, Q-211 (Q-218 answered 2026-10-08, adr-0021).
- Later waves: see the "Summary by gate" table on the register.

## Next action

1. **Build `interactive_plan/`** (p0.12–p0.16, continuing with p0.14 / IP-4: approvals store + API) by following
   [ip-build-plan](wiki/interactive-plan/ip-build-plan.md) IP-1 to IP-10 (mapping table on
   [phase-p0-planning](wiki/phases/phase-p0-planning.md)). Node: `export PATH="/c/Program Files/nodejs:$PATH"`.
   Wiki lint until IP-5: `python tools/quick_lint.py` (exits 1 on errors) and `cd interactive_plan && npm run lint:wiki`; tool tests: `python -m unittest discover -s tools -p "test_*.py"`.
2. After IP-10: the owner approves Wave 1 in the app (fix the reading-pass findings of the p0.8 lint log
   entry first), then Wave 2, then `phase-p0-planning#exit` (p0.17–p0.18). Before the exit approval, re-run
   `npm audit` in `interactive_plan/` and record it (accepted risk until then, ip-spec §7, wave 0c item 8).

## Pending owner approvals

Nothing is approved yet. Every approvable page is **PENDING**. The keys to approve, wave by wave, are in
[ops-approval-workflow §8](wiki/operations/ops-approval-workflow.md#8-approval-waves). Pages outside every
phase dependency set (risks, metrics, workloads, hypotheses, research questions, narrative pages) never
gate a phase and can be reviewed later.

## Last updated

2026-10-09, session s01 (after p0.12 / IP-3; next p0.14 / IP-4). Last handoff: none yet.
