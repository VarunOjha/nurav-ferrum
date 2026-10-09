---
id: status-live
type: status
title: "Ferrum live status and next action"
status: awaiting-owner
updated: 2026-10-08
sources:
  - raw/01-scoping-decisions.md
  - raw/research/nextjs-stack.md
related: [phase-p0-planning, phase-p1-foundation, ops-approval-workflow, ip-build-plan, ops-session-protocol, ops-resume-after-interruption, ops-environment-setup, ops-multi-agent-workflow, ops-wiki-maintenance, ov-open-questions, schema]
approvable: false
session: s01
current_phase: phase-p0-planning
current_task: p0.10
next_action: "Ask the owner Q-219 (wiki/overview/ov-open-questions.md: index ids for upper-case evidence names such as IP-0-toolchain.txt; the quick lint reports 1 INDEX-MISSING error until it is answered). After the answer: ingest it, apply the chosen fix, re-run the quick lint to 0 errors, then start p0.10 / IP-1 of wiki/interactive-plan/ip-build-plan.md (scaffold + spikes; Node via export PATH=\"/c/Program Files/nodejs:$PATH\")."
blocked_on: [Q-219]
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
and transcribed; the `interactive_plan/` app is not built yet; nothing is approved in `plan/approvals.json`
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
- p0.8 done (commit `04b27b9`): quick lint + integration lint 0 errors; manual checks and dispositions in
  [wiki-lint-manual.md](wiki/raw/evidence/phase-p0-planning/wiki-lint-manual.md);
  [wiki/raw/MANIFEST.sha256](wiki/raw/MANIFEST.sha256) created.

## In-flight

> Write-ahead record. Filled **before** a task touches files; cleared after it is verified and
> committed. Non-empty on session start = the previous session was interrupted mid-task.
> `STATUS.md`, `wiki/log.md` and `wiki/index.md` are bookkeeping paths and are implicitly touched.

none (p0.9 / IP-0 verified and committed as `1cfc2d5`)

## Blockers

| Blocker | Effect | Who | State (2026-10-08) |
|---|---|---|---|
| Owner answers to Approval Wave 0 (`ip-*` pages + adr-0016 approved in chat; Q-006, Q-007, Q-103, Q-210; Q-102 Node line) | Blocked building `interactive_plan/` (p0.9–p0.16) | Owner (chat) | **Resolved 2026-10-08**: transcribed in [wiki/raw/owner/2026-10-08-s01-wave0.md](wiki/raw/owner/2026-10-08-s01-wave0.md) and ingested |
| Node.js on PATH | Needed to scaffold/run `interactive_plan/` | Claude (workaround) | Node v24.20.0 is installed in `C:\Program Files\nodejs` but is **not on the default PATH** of the Claude Code Bash shell. Workaround: start every Bash call with `export PATH="/c/Program Files/nodejs:$PATH"`. Not blocking |
| Local commits (Q-104) | Recovery relied on STATUS + log only | Owner | **Resolved 2026-10-08**: yes, one local commit per verified task, never push |
| Who runs toolchain installs (Q-218; CONTRADICTION on adr-0005) | Holds P1 entry | Owner | Open (raised at the 2026-10-08 ingest) |
| Index ids for upper-case evidence names (Q-219) | Quick lint reports 1 INDEX-MISSING error (IP-0-toolchain); IP-9/IP-10 and the P0 exit need a clean lint. The build is paused before IP-1 (ip-build-plan stop condition: SCHEMA ambiguity in lint semantics) | Owner | Open |
| Rust (rustup/cargo), MSVC Build Tools | Block P1 toolchain tasks; do not block P0 | Owner (winget, adr-0005) | Not installed |
| Owner approvals | Every phase entry gate; `plan/approvals.json` does not exist | Owner (plan app) | Pending — plan app not built yet |

Exact install and verification commands: [wiki/operations/ops-environment-setup.md](wiki/operations/ops-environment-setup.md).

## Open questions

[ov-open-questions](wiki/overview/ov-open-questions.md): **41 open**, 7 answered (Q-006, Q-007, Q-101,
Q-102, Q-103, Q-104, Q-210), 3 withdrawn (Q-001–Q-003). Answer them by wave, not all at once
([ops-approval-workflow §8](wiki/operations/ops-approval-workflow.md#8-approval-waves)):

- **Now (pauses the plan-app build before IP-1):** Q-219 (index ids for upper-case evidence file names).
- **Wave 0 (before the plan app):** done 2026-10-08 ([raw/owner/2026-10-08-s01-wave0.md](wiki/raw/owner/2026-10-08-s01-wave0.md)).
- **Wave 1 (P0 exit):** Q-207 and Q-004 (closed by approving `schema`), Q-005, Q-108.
- **Wave 2 (P1 entry):** Q-106, Q-110, Q-211, Q-218 (new: who runs toolchain installs).
- Later waves: see the "Summary by gate" table on the register.

## Next action

1. **Ask the owner Q-219** (index ids for upper-case evidence names; see the register). Transcribe the
   answer to `wiki/raw/owner/`, ingest it, apply the fix, and re-run the quick lint to 0 errors.
2. **Then build `interactive_plan/`** (p0.10–p0.16, starting with p0.10 / IP-1) by following
   [ip-build-plan](wiki/interactive-plan/ip-build-plan.md) IP-1 to IP-10 (mapping table on
   [phase-p0-planning](wiki/phases/phase-p0-planning.md)). Wave 0 is transcribed in
   [raw/owner/2026-10-08-s01-wave0.md](wiki/raw/owner/2026-10-08-s01-wave0.md).
3. After IP-10: the owner approves Wave 1 in the app (fix the reading-pass findings of the p0.8 lint log
   entry first), then Wave 2 (answer Q-218 too), then `phase-p0-planning#exit` (p0.17–p0.18).

## Pending owner approvals

Nothing is approved yet. Every approvable page is **PENDING**. The keys to approve, wave by wave, are in
[ops-approval-workflow §8](wiki/operations/ops-approval-workflow.md#8-approval-waves). Pages outside every
phase dependency set (risks, metrics, workloads, hypotheses, research questions, narrative pages) never
gate a phase and can be reviewed later.

## Last updated

2026-10-08, session s01 (after p0.9 / IP-0; awaiting the owner on Q-219). Last handoff: none yet.
