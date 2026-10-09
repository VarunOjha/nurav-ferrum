---
id: metric-lifecycle-transitions
type: metric
title: "Lifecycle transition counts"
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
unit: count
definition: "Number of transitions per type (e.g. BACKGROUND->IDLE, IDLE->DISCARD_CANDIDATE, ->DISCARDED, DISCARDED->RESTORING, RESTORING->ACTIVE, suspend/resume, memory-target Low/Normal) per trial."
boundary_start: "Trial start"
boundary_end: "Trial end"
method: "Counted from Ferrum's structured lifecycle telemetry."
tool: "Ferrum telemetry (comp-telemetry)"
normalization: "per trial"
support: unverified
phase: phase-p7-lifecycle
tags:
  - research
  - metric
---

# Lifecycle transition counts

| Field | Value |
|---|---|
| Unit | count |
| Support | `unverified`. Nothing has been measured yet |
| Validated in | `phase-p7-lifecycle` |

**Definition.** Number of transitions per type (e.g. BACKGROUND->IDLE, IDLE->DISCARD_CANDIDATE, ->DISCARDED, DISCARDED->RESTORING, RESTORING->ACTIVE, suspend/resume, memory-target Low/Normal) per trial.

**Boundaries.** Start: Trial start. End: Trial end.

**Method.** Counted from Ferrum's structured lifecycle telemetry.

**Tool.** Ferrum telemetry (comp-telemetry)

**Normalisation.** per trial

## Notes
This is diagnostic: it explains *why* configurations differ on [metric-objective-j](metric-objective-j.md).

## Used by
Experiments and hypotheses that reference this metric are listed in [ov-research-traceability](../ov-research-traceability.md).
