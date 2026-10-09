---
id: metric-recovery-time
type: metric
title: "Crash recovery time"
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
unit: ms
definition: "Time from an induced renderer crash to the affected tab's fixture page reporting ready again (after automatic or scripted reload)."
boundary_start: "Fault injection issued by harness"
boundary_end: "Fixture 'ready' beacon from the reloaded page"
method: "One measurement per induced crash; failures to recover within timeout (proposed 60 s) recorded as non-recovery."
tool: "Harness + fixture server + Ferrum telemetry"
normalization: "none (ms)"
support: unverified
phase: phase-p6-benchmark-harness
tags:
  - research
  - metric
unverified:
  - claim: "Fault-injection method for crash recovery measurement"
    verify_in: phase-p6-benchmark-harness
---

# Crash recovery time

| Field | Value |
|---|---|
| Unit | ms |
| Support | `unverified`. Nothing has been measured yet |
| Validated in | `phase-p6-benchmark-harness` |

**Definition.** Time from an induced renderer crash to the affected tab's fixture page reporting ready again (after automatic or scripted reload).

**Boundaries.** Start: Fault injection issued by harness. End: Fixture 'ready' beacon from the reloaded page.

**Method.** One measurement per induced crash; failures to recover within timeout (proposed 60 s) recorded as non-recovery.

**Tool.** Harness + fixture server + Ferrum telemetry

**Normalisation.** none (ms)

## Notes
This metric depends on how faults are injected, which is UNVERIFIED[phase-p6-benchmark-harness] (see [metric-crash-count](metric-crash-count.md)).

## Used by
Experiments and hypotheses that reference this metric are listed in [ov-research-traceability](../ov-research-traceability.md).
