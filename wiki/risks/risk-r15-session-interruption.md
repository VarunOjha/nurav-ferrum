---
id: risk-r15
type: risk
title: "Token or session exhaustion interrupts work mid-change and loses state"
status: mitigating
updated: 2026-10-08
sources:
  - raw/01-scoping-decisions.md
  - SCHEMA.md
  - raw/research/llm-wiki-pattern.md
related: [phase-p0-planning, phase-p1-foundation, adr-0003, adr-0002, adr-0011, comp-interactive-plan, risk-r22, qual-definition-of-done, qual-phase-gate-checklist]
approvable: true
tags: [process, resumability, sessions]
likelihood: 5
impact: 3
mitigation: "Follow the SCHEMA RESUME and HANDOFF protocol: update STATUS.md and log.md after every task; keep tasks small enough to finish well inside one session; commit locally per task once adr-0011 authorises it; write a partial handoff early; make scripts idempotent; reconcile STATUS against git at every resume."
spike: null
owner_phase: phase-p1-foundation
trigger: "STATUS.md disagrees with git status or the last log entry; uncommitted changes without a matching log entry; code that no longer compiles at resume; a task id marked in progress across several sessions."
fallback: "At resume, trust git plus the log over STATUS, revert half-applied edits to the last good commit, and redo the task from its definition."
---

# risk-r15: Token or session exhaustion interrupts work mid-change and loses state

| Likelihood | Impact | Score | Status | Owner phase |
|---|---|---|---|---|
| 5 | 3 | 15 | mitigating | `phase-p1-foundation` |

Score = likelihood × impact (SCHEMA §6.5). Scales are planning judgements, not measurements. Full register: [ov-risk-register](ov-risk-register.md).

## Description and evidence

The owner stated that the project will span many sessions and days, will run out of tokens and must resume when interrupted (scoping decisions, directive 6). SCHEMA §9.5 and §9.6 define continuous checkpointing, HANDOFF and RESUME, and adr-0003 records the protocol. The llm-wiki pattern supplies the log format that makes the last entries greppable (LW).

Remaining exposure:
- A session can stop in the middle of a multi-file edit, leaving code that does not build.
- Until the wiki lint (`ip-wiki-lint`, P0) runs routinely, inconsistencies can slip into later sessions.
- Without local commits (adr-0011, owner authorisation), git cannot help reconcile state.

Sources: [scoping decisions](../raw/01-scoping-decisions.md), [llm-wiki-pattern](../raw/research/llm-wiki-pattern.md), [SCHEMA](../SCHEMA.md). Abbreviations: TW = tauri-webview2-capabilities, MM = measurement-methodology, RW = related-work-seed, NX = nextjs-stack, LW = llm-wiki-pattern.

## Early-warning signs (trigger)

STATUS.md disagrees with git status or the last log entry; uncommitted changes without a matching log entry; code that no longer compiles at resume; a task id marked in progress across several sessions.

## Mitigation

Follow the SCHEMA RESUME and HANDOFF protocol: update STATUS.md and log.md after every task; keep tasks small enough to finish well inside one session; commit locally per task once adr-0011 authorises it; write a partial handoff early; make scripts idempotent; reconcile STATUS against git at every resume.

## De-risking spike (proposed)

No spike. Exercise the protocol deliberately in `phase-p1-foundation`: end one session with a partial handoff mid-task, resume in a fresh session, and record whether the resume steps reached the correct next action.

The `spike` frontmatter field stays `null` until the owning phase page assigns a task id (`pN.M`); the integrator or phase owner then sets it here.

## Fallback if realised

At resume, trust git plus the log over STATUS, revert half-applied edits to the last good commit, and redo the task from its definition.

## Unverified claims

None beyond the sources cited above.

## Affects

`phase-p0-planning`, `phase-p1-foundation`, `adr-0003`, `adr-0002`, `adr-0011`, `comp-interactive-plan`, `risk-r22`, `qual-definition-of-done`, `qual-phase-gate-checklist`
