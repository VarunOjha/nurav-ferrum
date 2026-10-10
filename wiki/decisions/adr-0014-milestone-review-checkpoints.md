---
id: adr-0014
type: decision
title: "Owner review checkpoint after every milestone (phase exit approval)"
status: accepted
updated: 2026-10-09
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
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

This quoted choice is what `decided_by: owner` and `status: accepted` cover (SCHEMA §10.4 rule 3(b)).

### Claude elaboration (binding only once the owner APPROVES this ADR)

Everything below in this section is Claude's elaboration of the owner's choice. Under SCHEMA §10.4 it binds implementation only after the owner approves this ADR (given in Claude Code and recorded in `plan/approvals.json`, adr-0023); until then it is a proposal.

**Option B, applied to every phase, including P0 and P1, which have no milestone.** The recommended default is to apply it to those too, which is open question Q-108.

At the end of each phase, Claude:

1. runs every `test_gate.automated` item in the current repo state and saves the outputs under `wiki/raw/evidence/<phase-id>/`. Claude never claims a pass it did not observe;
2. lists the `test_gate.manual` checks for the owner to perform;
3. runs lint, which must be clean, and confirms that no unverified tag still targets this phase (lint code `UNV-PASTDUE`);
4. writes a short milestone report (what was built, the commands run, test results, known limitations, security considerations, next recommended phase), mirroring the master prompt §18 report list;
5. sets the phase to `gate-review`, logs `gate | <phase-id> exit ready for review` and **stops**.

The owner reviews the evidence and approves the key `<phase-id>#exit` in Claude Code; Claude records it ([ADR-0023](adr-0023-approvals-in-claude-code-portal-read-only.md)). Only then is the phase `done` and the next phase's entry gate evaluated.

## Consequences

### Positive

- The owner sees working, tested increments and can redirect between milestones.
- Gate evidence accumulates in `wiki/raw/evidence/`, which later becomes the reproducibility record for the paper.

### Negative

- Throughput depends on owner availability. Claude may do non-implementation work while waiting (lint, research notes, planning the next phase), but it must not start the next phase's implementation.
- A milestone report on a phase with failing tests is still delivered, as `gate-review` with known failures. The owner decides whether to accept or request changes.

### Follow-ups

- The plan app must support `<phase-id>#exit` approvals and show gate evidence links.

### Related risks and phases

- All phases. P0's exit approval is the owner's approval of the whole plan.

## Verification / evidence

- Owner answer Q11: [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md).
- Gate procedure: [SCHEMA §9.7](../SCHEMA.md#97-phase-gate-extension).
- Check: for every phase with `status: done`, `plan/approvals.json` holds an `approved` entry for `<phase-id>#exit`, and `wiki/raw/evidence/<phase-id>/` exists.
