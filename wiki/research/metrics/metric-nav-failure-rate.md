---
id: metric-nav-failure-rate
type: metric
title: "Navigation failure rate"
status: proposed
updated: 2026-10-08
sources:
  - raw/research/measurement-methodology.md
  - raw/00-master-prompt.md
related:
  - ov-research-plan
  - ov-research-traceability
  - comp-telemetry
  - comp-benchmark-harness
approvable: true
unit: ratio
definition: "Failed navigations divided by attempted navigations per trial; failure = destination page did not report its timing beacon within the timeout, or the product reported a navigation error."
boundary_start: "Navigation trigger issued by harness"
boundary_end: "Beacon received or timeout (proposed 30 s)"
method: "Count per trial; failures categorised (timeout, network error, policy block, crash). Policy blocks in security fixtures are expected outcomes, counted separately and never as failures."
tool: "Fixture server log; CDP events; Ferrum telemetry"
normalization: "Proportion with Wilson or Clopper-Pearson interval"
support: unverified
phase: phase-p5-telemetry
tags:
  - research
  - metric
---

# Navigation failure rate

| Field | Value |
|---|---|
| Unit | ratio |
| Support | `unverified`. Nothing has been measured yet |
| Validated in | `phase-p5-telemetry` |

**Definition.** Failed navigations divided by attempted navigations per trial; failure = destination page did not report its timing beacon within the timeout, or the product reported a navigation error.

**Boundaries.** Start: Navigation trigger issued by harness. End: Beacon received or timeout (proposed 30 s).

**Method.** Count per trial; failures categorised (timeout, network error, policy block, crash). Policy blocks in security fixtures are expected outcomes, counted separately and never as failures.

**Tool.** Fixture server log; CDP events; Ferrum telemetry

**Normalisation.** Proportion with Wilson or Clopper-Pearson interval

## Notes
- Failed navigations are kept and reported. They are never re-run to replace a failure ([ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md)).

## Used by
Experiments and hypotheses that reference this metric are listed in [ov-research-traceability](../ov-research-traceability.md).
