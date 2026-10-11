---
id: adr-0014
type: decision
title: "Owner review checkpoint after every milestone (phase exit approval)"
status: accepted
updated: 2026-10-11
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/owner/2026-10-10-s01-q008-and-pause.md
  - raw/owner/2026-10-11-s01-wave1-answers-and-p0-signoff.md
related: [adr-0001, adr-0003, adr-0016, schema, phase-p0-planning, phase-p1-foundation, phase-p2-minimal-container, phase-p8-research-paper, comp-interactive-plan]
approvable: true
date: 2026-10-08
decided_by: owner
supersedes: []
options:
  - "Continuous implementation; owner reviews at will"
  - "Stop after each milestone for owner review and approval"
  - "Review only at project end"
phase: phase-p0-planning
tags: [process, review, gating]
---

# ADR-0014: Owner review checkpoint after every milestone

## Context

The master prompt structures delivery as Milestones M1–M7 ([raw/00-master-prompt.md](../raw/00-master-prompt.md) §16). Scoping question Q11 asked about review checkpoints. The owner chose **"Stop after each milestone for owner review/approval"** ([raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md)).

The phase plan maps the milestones onto phases:

| Phase | Milestone |
|---|---|
| `phase-p0-planning`, `phase-p1-foundation` | none |
| `phase-p2-minimal-container` | M1 |
| `phase-p3-tabs-sessions` | M2 |
| `phase-p4-security` | M3 |
| `phase-p5-telemetry` | M4 |
| `phase-p6-benchmark-harness` | M5 |
| `phase-p7-lifecycle` | M6 |
| `phase-p8-research-paper` | M7 |

## Options considered

| Option | Pros | Cons |
|---|---|---|
| A. Continuous; owner reviews at will | Fastest | Drift risk. Conflicts with the owner's answer |
| B. **Stop after each milestone for review and approval** | Owner control at natural boundaries. Matches phase gating ([ADR-0001](adr-0001-planning-first-phase-gating.md)) | Idle time while waiting for review |
| C. Review only at the end | Least owner effort | Late discovery of problems. Not the owner's choice |

## Decision

### Owner decision (verbatim)

As recorded in [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md), scoping answer Q11 (that file records the owner's words verbatim-in-substance):

> Q11 Review checkpoints: **Stop after each milestone** for owner review/approval

On 2026-10-10 the owner added a standing directive in chat
([raw/owner/2026-10-10-s01-q008-and-pause.md](../raw/owner/2026-10-10-s01-q008-and-pause.md)):

> Make sure to pause when completing the planning phase and before building the next phase

These quoted choices are what `decided_by: owner` and `status: accepted` cover (SCHEMA §10.4 rule 3(b)). The
2026-10-10 directive is owner words, so it binds now: Claude pauses when P0 (the planning phase) is complete
and before building any next phase, whatever the answer to Q-108.

### Claude elaboration (binding only once the owner APPROVES this ADR)

Everything below in this section is Claude's elaboration of the owner's choice. Under SCHEMA §10.4 it binds implementation only after the owner approves this ADR (given in Claude Code and recorded in `plan/approvals.json`, adr-0023); until then it is a proposal.

**Option B, applied to every phase, including P0 and P1, which have no milestone.** The owner confirmed this on 2026-10-11: Q-108 answered yes ([raw/owner/2026-10-11-s01-wave1-answers-and-p0-signoff.md](../raw/owner/2026-10-11-s01-wave1-answers-and-p0-signoff.md)), and this ADR was approved in Approval Wave 1 the same day.

At the end of each phase, Claude:

1. runs every `test_gate.automated` item in the current repo state and saves the outputs under `wiki/raw/evidence/<phase-id>/`. Claude never claims a pass it did not observe;
2. lists the `test_gate.manual` checks for the owner to perform;
3. runs lint, which must be clean, and confirms that no unverified tag still targets this phase (lint code `UNV-PASTDUE`);
4. writes a short milestone report (what was built, the commands run, test results, known limitations, security considerations, next recommended phase), mirroring the master prompt §18 report list;
5. sets the phase to `gate-review`, logs `gate | <phase-id> exit ready for review` and **stops**.

The owner reviews the evidence and approves the key `<phase-id>#exit` in Claude Code; Claude records it ([ADR-0023](adr-0023-approvals-in-claude-code-portal-read-only.md)). Only then is the phase `done`.

**Pause before the next phase (owner directive 2026-10-10, SCHEMA §9.7 exit-gate step 7).** The exit approval
is not a go-ahead. Claude stays paused until the owner explicitly says in chat to start the next phase; Claude
transcribes it to `wiki/raw/owner/`, logs `gate | <next-phase-id> go-ahead given`, and only then evaluates the
next phase's entry gate. For P0 this means: portal review, approvals in chat, P0 sign-off, then a pause; P1
does not start without the owner's explicit go.

## Consequences

### Positive

- The owner sees working, tested increments and can redirect between milestones.
- Gate evidence accumulates in `wiki/raw/evidence/`, which later becomes the reproducibility record for the paper.

### Negative

- Throughput depends on owner availability. While waiting, Claude may only finish up the closed phase (lint, wording fixes, recording answers); it starts no work of the next phase (no task, install, scaffold or spike) until the owner's explicit go-ahead (2026-10-10 directive).
- A milestone report on a phase with failing tests is still delivered, as `gate-review` with known failures. The owner decides whether to accept or request changes.

### Follow-ups

- The plan app must support `<phase-id>#exit` approvals and show gate evidence links.

### Related risks and phases

- All phases. P0's exit approval is the owner's approval of the whole plan.

## Verification / evidence

- Owner answer Q11: [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md).
- Gate procedure: [SCHEMA §9.7](../SCHEMA.md#97-phase-gate-extension).
- Check: for every phase with `status: done`, `plan/approvals.json` holds an `approved` entry for `<phase-id>#exit`, and `wiki/raw/evidence/<phase-id>/` exists.
