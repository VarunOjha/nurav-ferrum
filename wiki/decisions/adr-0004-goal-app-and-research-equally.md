---
id: adr-0004
type: decision
title: "Goal: a usable application and a rigorous research framework, equally and in lock-step"
status: accepted
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/research/related-work-seed.md
related: [adr-0001, adr-0012, adr-0013, adr-0014, phase-p2-minimal-container, phase-p5-telemetry, phase-p6-benchmark-harness, phase-p7-lifecycle, phase-p8-research-paper, comp-telemetry, comp-benchmark-harness, comp-research-analysis]
approvable: true
date: 2026-10-08
decided_by: owner
supersedes: []
options:
  - "Application first; research later as an add-on"
  - "Research prototype first; usability secondary"
  - "Both equally, developed in lock-step"
phase: phase-p0-planning
tags: [scope, research, product]
---

# ADR-0004: Goal is a usable application AND a rigorous research framework, equally

## Context

The master prompt asks for two things at once ([raw/00-master-prompt.md](../raw/00-master-prompt.md) §1, §2, §13, §14):

- a functioning, security-conscious Windows web-app container;
- a reproducible experimental framework and a research manuscript.

Scoping question Q1 asked which comes first. The owner answered **"Both, equally — usable app AND rigorous research framework, developed in lock-step"** ([raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md), Q1).

The seed related-work list shows substantial prior art for resource-aware tab lifecycle policies: Chrome freezing, Edge sleeping tabs, Android App Standby Buckets and GreedyDual-Size ([raw/research/related-work-seed.md](../raw/research/related-work-seed.md), A3, B2, F2, G1). The research contribution therefore cannot rest on assumed novelty.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| A. App first, research later | Quicker usable product | Instrumentation retrofitted late is costly. Experiments may find the app's design unmeasurable, for example with no hooks for lifecycle transitions |
| B. Research prototype first | Fastest route to experiments | The master prompt requires a usable browser-like app (tabs, sessions, security). Experiments on an unrealistic prototype weaken external validity |
| C. **Both equally, in lock-step** | Every feature is built measurable from the start. The app stays realistic, so the results transfer | More work per phase. Some convenience features compete with research needs for time |

## Decision

### Owner decision (verbatim)

As recorded in [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md), scoping answer Q1 (that file records the owner's words verbatim-in-substance):

> Q1 Primary goal: **Both, equally** — usable app AND rigorous research framework, developed in lock-step

This quoted choice is what `decided_by: owner` and `status: accepted` cover (SCHEMA §10.4 rule 3(b)).

### Claude elaboration (binding only once this ADR is APPROVED in the plan app)

Everything below in this section is Claude's elaboration of the owner's choice. Under SCHEMA §10.4 it binds implementation only after the owner approves this ADR in the plan app; until then it is a proposal.

**Option C.** Each implementation phase delivers both a user-visible capability and the instrumentation or test hooks it needs for research:

- P2 and P3 deliver usable navigation, tabs and sessions, with the telemetry hooks designed in (lifecycle transition events and navigation timing points) even before `comp-telemetry` collects them in P5.
- P5 and P6 deliver measurement and the benchmark harness, with the app as the system under test.
- P7 delivers the lifecycle policies as feature-flagged configurations (`cfg-ferrum-nolifecycle` and `cfg-ferrum-adaptive`, master prompt §6 and §8).
- P8 delivers the manuscript with no claim beyond the evidence.

## Consequences

### Positive

- The research and the product validate each other. Comparisons use a real app, and app optimisations must be justified by benchmarks (master prompt §15: "Every optimization must have an associated benchmark").
- Research integrity rules carry the same weight as engineering quality ([SCHEMA §7](../SCHEMA.md#7-integrity-tagging-machine-checkable)).

### Negative

- Convenience features in the master prompt that have no research value are scheduled late or after the research track. The sidebar and split view are examples ("Split-view support in a later phase", master prompt §4).
- The product must never be tuned to the benchmark. Fairness rules forbid disabling competitors' resource-saving features to improve Ferrum's results (master prompt §8). An application feature that only helps a benchmark is not allowed.

### Follow-ups

- The phase pages carry both app deliverables and research deliverables. The plan app's traceability view (research question → hypothesis → experiment → metric → raw data) makes the research half visible.
- A systematic literature review is a P8 deliverable and must come before any novelty claim ([raw/research/related-work-seed.md](../raw/research/related-work-seed.md) header).

### Related risks and phases

- `phase-p2-minimal-container` … `phase-p8-research-paper`; `comp-telemetry`, `comp-benchmark-harness`, `comp-research-analysis`.

## Verification / evidence

- Owner answer Q1: [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md).
- Gate check: every phase from P2 onward lists at least one research-facing deliverable or test hook, and every experiment page traces back to a research question.
