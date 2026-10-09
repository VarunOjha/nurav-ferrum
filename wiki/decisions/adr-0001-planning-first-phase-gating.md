---
id: adr-0001
type: decision
title: "Planning first, then phase-gated implementation with owner approval"
status: accepted
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
related: [adr-0002, adr-0003, adr-0014, adr-0016, schema, phase-p0-planning, phase-p1-foundation, comp-interactive-plan]
approvable: true
date: 2026-10-08
decided_by: owner
supersedes: []
options:
  - "Implement Milestone 1 immediately (master prompt §17-§18 as written)"
  - "Plan once, then implement all milestones without further approvals"
  - "Complete plan first, then phase-by-phase implementation gated by owner approval and per-phase test gates"
phase: phase-p0-planning
tags: [process, governance, gating]
---

# ADR-0001: Planning first, then phase-gated implementation with owner approval

## Context

The master prompt ([raw/00-master-prompt.md](../raw/00-master-prompt.md) §17–§18) tells Claude to inspect the environment, write a plan and then "Start implementation now". The owner **explicitly cancelled** that last instruction ([raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md), owner directives 1, 4, 5 and 9):

- "Ignore 'Start implementation now…' — let's ask and plan well before we proceed."
- "First the interactive plan comes together. I then approve everything else."
- "We go phase wise. We do phase-wise testing and rigorous testing."
- "First create this larger plan + structure and then I will approve implementation."

The environment also prevents immediate implementation. On 2026-10-08 Rust, MSVC Build Tools and Node.js were not installed (same raw file, "Environment observed"). And the project is both an application and a research study ([ADR-0004](adr-0004-goal-app-and-research-equally.md)), so decisions made early (process attribution, hosting model, isolation) affect research validity later.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| A. Implement M1 immediately (master prompt as written) | Fastest path to a running app | Owner cancelled it. The toolchain is missing anyway. Several hosting and isolation questions (see [ADR-0007](adr-0007-child-webviews.md), [ADR-0010](adr-0010-isolation-webview2-profiles.md)) would be settled by accident in code, not by decision |
| B. Plan once, then implement everything without further approvals | Low owner overhead | Contradicts directive 5 ("phase wise"). Research findings that land mid-project could silently change direction. No point at which the owner can stop drift |
| C. **Complete plan first, then phase-by-phase implementation, each phase gated by owner approval and its own test gate** | Matches all owner directives. Every phase has explicit entry and exit criteria. Decisions are reviewable before code depends on them. Fits multi-session work ([ADR-0003](adr-0003-multi-session-resumability.md)) | Slower start. Approval bookkeeping is needed (hashes, stale detection). The owner must review regularly |

## Decision

### Owner decision (verbatim)

As recorded in [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md), owner directives 1, 4, 5 and 9 (that file records the owner's words verbatim-in-substance):

> 1. "Ignore 'Start implementation now…' — let's ask and plan well before we proceed."  
> 4. "First the interactive plan comes together. I then approve everything else."  
> 5. "We go phase wise. We do phase-wise testing and rigorous testing."  
> 9. "First create this larger plan + structure and then I will approve implementation."

This quoted choice is what `decided_by: owner` and `status: accepted` cover (SCHEMA §10.4 rule 3(b)).

### Claude elaboration (binding only once this ADR is APPROVED in the plan app)

Everything below in this section is Claude's elaboration of the owner's choice. Under SCHEMA §10.4 it binds implementation only after the owner approves this ADR in the plan app; until then it is a proposal.

**Option C.** The project runs as nine phases, `phase-p0-planning` to `phase-p8-research-paper`. P0 produces only the plan, the wiki and the interactive plan app ([ADR-0016](adr-0016-interactive-plan-nextjs.md)). It writes no Ferrum application code (no Rust and no Tauri project).

Each phase has:

1. an **entry gate**: its dependency set (the phase page, its ADRs, its components, its experiments and `schema`) is owner-approved, and no open question blocks it ([SCHEMA §9.7](../SCHEMA.md#97-phase-gate-extension));
2. a **test gate**: automated commands, manual owner checks and evidence files under `wiki/raw/evidence/<phase-id>/`, all declared on the phase page;
3. an **exit gate**: tests were observed passing in the current repo state, lint is clean, and the owner approves `<phase-id>#exit` ([ADR-0014](adr-0014-milestone-review-checkpoints.md)).

Approvals are recorded only by the plan app in `plan/approvals.json`. Claude never writes that file ([SCHEMA §10](../SCHEMA.md#10-approvals-planapprovalsjson)).

## Consequences

### Positive

- No code depends on an unapproved decision. Research findings that contradict owner decisions surface in ADRs before implementation (see the CONTRADICTION notes in [ADR-0009](adr-0009-benchmark-hardware-energy.md) and [ADR-0010](adr-0010-isolation-webview2-profiles.md)).
- "Phase-wise rigorous testing" becomes a mechanical requirement: no exit without observed test evidence.
- A fresh session can tell from files alone whether it is allowed to implement (entry gate check).

### Negative

- Calendar time to the first running Ferrum binary is longer than under option A.
- Editing an approved page after approval makes it STALE, which can block work until it is re-approved. This is intended, but it costs owner time.
- The interactive plan app becomes a prerequisite for approvals, so its own build is on the critical path of P0. Building it inside P0 is settled by owner directives 2 and 4 ([raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md)); Q-101 in [ov-open-questions](../overview/ov-open-questions.md) is answered by those directives and blocks nothing.

### Follow-ups

- The owner approves `schema`, the P0 pages and the P1 dependency set in the plan app before P1 starts.
- Claude transcribes any approval the owner gives in chat into `wiki/raw/owner/` and asks the owner to click Approve. It never edits `plan/approvals.json`.

### Related risks and phases

- Phases: `phase-p0-planning` (this decision is its core), and every later phase through its entry and exit gates.
- Components: `comp-interactive-plan` (the approval UI).

## Verification / evidence

- The owner directives are recorded in [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md). The cancelled instruction is struck through in [raw/00-master-prompt.md](../raw/00-master-prompt.md) §18.
- Compliance check at every gate: `log.md` contains `gate | <phase-id> entry passed` before any `code` entry of that phase, and `plan/approvals.json` holds a non-STALE approval for each id in the dependency set.
