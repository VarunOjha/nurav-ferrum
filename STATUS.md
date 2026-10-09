---
id: status-live
type: status
title: "Ferrum live status and next action"
status: active
updated: 2026-10-08
sources:
  - raw/01-scoping-decisions.md
  - raw/research/nextjs-stack.md
related: [phase-p0-planning, phase-p1-foundation, ops-approval-workflow, ip-build-plan, ops-session-protocol, ops-resume-after-interruption, ops-environment-setup, ops-multi-agent-workflow, ops-wiki-maintenance, ov-open-questions, schema]
approvable: false
session: s01
current_phase: phase-p0-planning
current_task: p0.8
next_action: "p0.8: from the repo root (Git Bash) run the quick lint from wiki/operations/ops-wiki-maintenance.md section 5 (save it to the scratchpad, or to tools/quick_lint.py once the owner accepts the Q-216 default), plus the manual checks listed there; write wiki/raw/evidence/phase-p0-planning/wiki-lint-manual.md and wiki/raw/MANIFEST.sha256 (SCHEMA section 3.1 format); append a lint log entry. Then ask the owner the Approval Wave 0 items (ops-approval-workflow section 8) plus Q-104 and Q-102."
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

P0 state in one line: **the wiki is drafted, reviewed and integrated; the `interactive_plan/` app is not
built yet; nothing is approved yet (every approvable page is PENDING) and the owner's answers are awaited.**

## Done this session (s01)

- Scoping Q&A with the owner recorded in [wiki/raw/01-scoping-decisions.md](wiki/raw/01-scoping-decisions.md);
  master prompt stored verbatim in [wiki/raw/00-master-prompt.md](wiki/raw/00-master-prompt.md).
- `git init -b main` performed (no commits yet; Q-104 is open).
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

## In-flight

> Write-ahead record. Filled **before** a task touches files; cleared after it is verified and
> committed. Non-empty on session start = the previous session was interrupted mid-task.
> `STATUS.md`, `wiki/log.md` and `wiki/index.md` are bookkeeping paths and are implicitly touched.

none (p0.7 completed and verified by the integration lint; no commit, because local commits are not yet
authorised, Q-104)

## Blockers

| Blocker | Effect | Who | State (2026-10-08) |
|---|---|---|---|
| Owner answers to Approval Wave 0 (`ip-*` pages + adr-0016 approved in chat; Q-006, Q-007, Q-103, Q-210; Q-102 Node line) | Blocks building `interactive_plan/` (p0.9–p0.16) | Owner (chat) | Not asked yet |
| Node.js on PATH | Needed to scaffold/run `interactive_plan/` | Owner (restart Claude Code / terminal) | `C:\Program Files\nodejs\node.exe` exists, but `node` is **not on this session's PATH** (re-checked at integration). Session s01 earlier observed v24.20.0 / npm 11.19.0; not yet in a raw record (p0.9 records it) |
| Local commits (Q-104) | No git history yet, so recovery relies on STATUS + log only | Owner | Open |
| Rust (rustup/cargo), MSVC Build Tools | Block P1 toolchain tasks; do not block P0 | Owner (winget, adr-0005) | Not installed |
| Owner approvals | Every phase entry gate; `plan/approvals.json` does not exist | Owner (plan app) | Pending — plan app not built yet |

Exact install and verification commands: [wiki/operations/ops-environment-setup.md](wiki/operations/ops-environment-setup.md).

## Open questions

[ov-open-questions](wiki/overview/ov-open-questions.md): **45 open**, 1 answered (Q-101), 3 withdrawn
(Q-001–Q-003). Answer them by wave, not all at once
([ops-approval-workflow §8](wiki/operations/ops-approval-workflow.md#8-approval-waves)):

- **Now (Wave 0, before the plan app):** Q-006, Q-007, Q-103, Q-210, plus Q-102 (Node line) and Q-104
  (local commits, ideally answered now so P0 checkpoints become commits).
- **Wave 1 (P0 exit):** Q-207 and Q-004 (closed by approving `schema`), Q-005, Q-108.
- **Wave 2 (P1 entry):** Q-106, Q-110, Q-211 (and Q-104 if still open).
- Later waves: see the "Summary by gate" table on the register.

## Next action

1. **p0.8 (Claude, no owner input needed):** run the quick lint
   ([ops-wiki-maintenance §5](wiki/operations/ops-wiki-maintenance.md#5-lint)) and the manual checks listed
   there (UNV-PASTDUE, INT-NUMBER-NOSRC, CONTRADICTION reading pass and the others); write
   `wiki/raw/evidence/phase-p0-planning/wiki-lint-manual.md` (each code with its result) and create
   `wiki/raw/MANIFEST.sha256` (SCHEMA §3.1 format: `<sha256>  <path>` per raw file, LF-normalised bytes);
   record the manifest's own sha256 in the evidence; append a `lint` log entry. p0.1's verify (raw file
   hashes in the p0.8 evidence) completes here too. p0.6's verify still needs the INT-NUMBER-NOSRC grep.
2. **Ask the owner** the Wave 0 items above and Q-104. Transcribe every answer verbatim to
   `wiki/raw/owner/2026-10-DD-<slug>.md`, set the question to `answered`, and log `ingest`.
3. **Then workflow 2 — build `interactive_plan/`** (p0.9–p0.16) by following
   [ip-build-plan](wiki/interactive-plan/ip-build-plan.md) IP-0 to IP-10, once (a) Wave 0 is transcribed,
   (b) Node is on PATH: restart Claude Code, run `node --version` and `npm --version`, and save the output
   as `wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-0-toolchain.txt` (Node major must be 24).
4. After IP-10: the owner approves Wave 1 in the app, then Wave 2, then `phase-p0-planning#exit` (p0.17–p0.18).

## Pending owner approvals

Nothing is approved yet. Every approvable page is **PENDING**. The keys to approve, wave by wave, are in
[ops-approval-workflow §8](wiki/operations/ops-approval-workflow.md#8-approval-waves). Pages outside every
phase dependency set (risks, metrics, workloads, hypotheses, research questions, narrative pages) never
gate a phase and can be reviewed later.

## Last updated

2026-10-08, session s01 (integrator, end of p0.7). Last handoff: none yet.
