---
id: adr-0003
type: decision
title: "Multi-session resumability protocol (checkpoint, handoff, resume)"
status: accepted
updated: 2026-10-09
sources:
  - raw/01-scoping-decisions.md
  - raw/research/llm-wiki-pattern.md
related: [adr-0001, adr-0002, adr-0011, adr-0012, schema, phase-p0-planning, phase-p6-benchmark-harness, comp-benchmark-harness]
approvable: true
date: 2026-10-08
decided_by: owner
supersedes: []
options:
  - "Rely on conversation memory and auto-compaction"
  - "Handoff note only at the end of each session"
  - "Continuous checkpointing to STATUS.md + log.md, plus full handoff notes and a fixed RESUME procedure"
phase: phase-p0-planning
tags: [process, resumability, handoff]
---

# ADR-0003: Multi-session resumability protocol

## Context

The owner stated: "It is assumed that this project will take multiple sessions + multiple days and will run out of tokens and will resume when interrupted — put all of that in the md files" ([raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md), directive 6).

A session can therefore end **without warning**, in the middle of a task. The next session has no memory of it. Karpathy's gist provides a parseable `log.md` and an `index.md`, but it defines no handoff or resume semantics. Those are our extension ([raw/research/llm-wiki-pattern.md](../raw/research/llm-wiki-pattern.md) §7.3).

## Options considered

| Option | Pros | Cons |
|---|---|---|
| A. Rely on conversation memory or auto-compaction | Zero overhead | Fails exactly in the scenario the owner described (tokens run out, new session). Not inspectable |
| B. Handoff note only at session end | Simple | A session that dies abruptly writes no handoff, so all work since the last handoff is unrecorded |
| C. **Continuous checkpointing plus full handoffs plus a fixed RESUME procedure** | An abrupt stop loses at most one task. Git plus the log can reconcile a stale STATUS. Every step is a file the owner can read | Bookkeeping after every task. Needs discipline (and lint) to stay accurate |

The research note proposed a `wiki/NOW.md` pointer and `wiki/sessions/` handoffs (§6.2). The schema adopted the same idea under different paths: a root `STATUS.md` with structured frontmatter (`id: status-live`) and handoffs in `wiki/operations/handoffs/`. This ADR follows the schema paths.

## Decision

### Owner decision (verbatim)

As recorded in [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md), owner directive 6 (that file records the owner's words verbatim-in-substance):

> 6. "It is assumed that this project will take multiple sessions + multiple days and will run out of tokens and will resume when interrupted — put all of that in the md files."

This quoted choice is what `decided_by: owner` and `status: accepted` cover (SCHEMA §10.4 rule 3(b)).

### Claude elaboration (binding only once the owner APPROVES this ADR)

Everything below in this section is Claude's elaboration of the owner's choice. Under SCHEMA §10.4 it binds implementation only after the owner approves this ADR (given in Claude Code and recorded in `plan/approvals.json`, adr-0023); until then it is a proposal.

**Option C**, as specified normatively in [SCHEMA §9.5 HANDOFF and §9.6 RESUME](../SCHEMA.md#95-handoff-extension-end-of-session-or-the-context-running-low):

1. **Checkpoint after every completed task (`pN.M`).** Update `STATUS.md` (frontmatter: `session`, `current_phase`, `current_task`, `next_action`, `blocked_on`, `last_handoff`) and append a `log.md` entry.
2. **Full handoff** when work stops, when the owner asks, or when context is judged near its limit (early rather than late). Steps: quick lint, then write `wiki/operations/handoffs/handoff-YYYY-MM-DD-sNN.md` (Done / In progress / Next / Blockers / Notes), then update STATUS, then a `handoff` log entry, then a local commit if commits are authorised ([ADR-0011](adr-0011-git-ci-license.md)).
3. **RESUME** at the start of every session:
   1. read `CLAUDE.md`, `wiki/SCHEMA.md` and `STATUS.md`;
   2. read the last five log entries (`grep "^## \[" wiki/log.md | tail -5`) and the latest handoff;
   3. read `wiki/index.md`;
   4. reconcile with `git status` / `git log -3` (git plus the log win over STATUS);
   5. run the phase entry gate;
   6. assign the next session id and log `resume`.
4. `next_action` is always a **literal command or step**, never a vague intention.
5. **Benchmark campaigns that span sessions** (proposed rule; the matching open/sealed amendment to [SCHEMA §3.1](../SCHEMA.md#31-raw-sources-wikiraw-immutable) was applied on 2026-10-08; the resume procedure is in [ops-resume-after-interruption](../operations/ops-resume-after-interruption.md)):
   - **Open vs sealed runs.** A `raw/bench/<run-id>/` directory is *open* while its campaign runs. Each resumed segment writes **new files only**, under `segment-NN/`; no existing file is ever rewritten or appended to after it is written. When the campaign ends, the orchestrator writes a `SEALED` marker with a checksum manifest of every file. `RAW-IMMUTABLE` applies to every already-written file at all times, and to the whole directory once sealed.
   - **Campaign in flight at RESUME.** Before anything else, check for running harness processes (for example `tasklist` filtered on the orchestrator and browser executables) and for an open (unsealed) run directory. Never start a second campaign while one is running. Never kill a campaign process started by an earlier session without owner consent. Resume an interrupted campaign **only** through the orchestrator's resume command, and log it as a `resume` of that run id. Trials that overlap with a dead session's activity (for example a session's own tool processes running during measurement) are flagged by the orchestrator under the pre-registered exclusion rules, never silently dropped.

## Consequences

### Positive

- Any fresh session, including one with a different model or after days away, can continue from files alone.
- The owner can see exactly where the project stands by reading `STATUS.md`. The plan app can show it too.
- Interrupted tasks are detectable: a `code` log entry for a task with no matching STATUS update, or uncommitted paths listed in the handoff.

### Negative

- It costs tokens and time on every task. Long tasks should be split so that checkpoints are frequent.
- Without local commits, git cannot serve as the reconciliation source. Whether Claude may commit locally is open question Q-104 ([ov-open-questions](../overview/ov-open-questions.md)). The recommended default is yes: one local commit per completed task and one at each handoff, never a push.

### Follow-ups

- P0: create `CLAUDE.md` (bootstrap with the RESUME steps), `STATUS.md` and the first handoff.
- P1: the lint script checks the STATUS frontmatter and that `last_handoff` resolves.

### Related risks and phases

- Every phase. Most exposed are long implementation phases (`phase-p3-tabs-sessions`, `phase-p6-benchmark-harness`, `phase-p7-lifecycle`), where a benchmark campaign may span sessions. Campaign state is therefore checkpointed in the harness output under `raw/bench/<run-id>/`, using new `segment-NN/` files per resumed segment and a final `SEALED` manifest (Decision rule 5), so checkpointing never rewrites a raw file.

## Verification / evidence

- Directive source: [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md).
- Operational check, run at every gate: `STATUS.md` frontmatter validates, `last_handoff` resolves to an existing handoff, and the last log entry's date is not older than the last commit's date.
- A deliberate drill is recommended at the end of P1: start a fresh session, give it only "resume", and check that it reproduces the correct `next_action`. This is a manual owner check proposed for `phase-p1-foundation`'s test gate.
