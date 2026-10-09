---
id: metric-wall-energy
type: metric
title: "Wall (AC) energy"
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
unit: J
definition: "Energy measured by a logging AC wall-power meter over the window, minus the same session's idle-baseline energy for the same duration."
boundary_start: "Window start (harness timestamp; meter log clock-aligned)"
boundary_end: "Window end"
method: "Meter logging at its native rate; clock alignment via a scripted load pulse at session start. Includes PSU loss, GPU, fans; display powered separately (recorded)."
tool: "External logging wall-power meter (model TBD; owner question)"
normalization: "J per completed workload above idle baseline; ratio to reference configuration for J"
support: unverified
phase: phase-p6-benchmark-harness
tags:
  - research
  - metric
---

# Wall (AC) energy

| Field | Value |
|---|---|
| Unit | J |
| Support | `unverified`. Nothing has been measured yet |
| Validated in | `phase-p6-benchmark-harness` |

**Definition.** Energy measured by a logging AC wall-power meter over the window, minus the same session's idle-baseline energy for the same duration.

**Boundaries.** Start: Window start (harness timestamp; meter log clock-aligned). End: Window end.

**Method.** Meter logging at its native rate; clock alignment via a scripted load pulse at session start. Includes PSU loss, GPU, fans; display powered separately (recorded).

**Tool.** External logging wall-power meter (model TBD; owner question)

**Normalisation.** J per completed workload above idle baseline; ratio to reference configuration for J

## Notes
- An external meter is the only way to support whole-system energy claims on this desktop ([measurement note](../../raw/research/measurement-methodology.md) §5.4, DERIVED).
- Whether a meter will be available is an **owner question** (see [ov-research-plan](../ov-research-plan.md), open questions). Without one, this metric is `unsupported`.

## Used by
Experiments and hypotheses that reference this metric are listed in [ov-research-traceability](../ov-research-traceability.md).
