---
id: metric-frame-miss-rate
type: metric
title: "Frame miss rate"
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
definition: "During a phase where the fixture changes content every display refresh, the fraction of display refresh intervals in which no new frame was displayed."
boundary_start: "Start of animation phase"
boundary_end: "End of animation phase"
method: "Derived from PresentMon displayed-frame timestamps and the recorded display refresh rate: expected_intervals = phase_duration x refresh_rate; missed = expected - displayed changes."
tool: "PresentMon + recorded display mode"
normalization: Proportion
support: unverified
phase: phase-p6-benchmark-harness
tags:
  - research
  - metric
unverified:
  - claim: "Derivation of frame miss rate from PresentMon displayed-frame timestamps"
    verify_in: phase-p6-benchmark-harness
---

# Frame miss rate

| Field | Value |
|---|---|
| Unit | ratio |
| Support | `unverified`. Nothing has been measured yet |
| Validated in | `phase-p6-benchmark-harness` |

**Definition.** During a phase where the fixture changes content every display refresh, the fraction of display refresh intervals in which no new frame was displayed.

**Boundaries.** Start: Start of animation phase. End: End of animation phase.

**Method.** Derived from PresentMon displayed-frame timestamps and the recorded display refresh rate: expected_intervals = phase_duration x refresh_rate; missed = expected - displayed changes.

**Tool.** PresentMon + recorded display mode

**Normalisation.** Proportion

## Notes
- This is the project's own operational definition of the master prompt's "dropped frames". It is not a standard counter, and the derivation is UNVERIFIED[phase-p6-benchmark-harness].
- LoAF is **not** a dropped-frame counter ([measurement note](../../raw/research/measurement-methodology.md) §4.1, VERIFIED). See [metric-loaf-blocking](metric-loaf-blocking.md).

## Used by
Experiments and hypotheses that reference this metric are listed in [ov-research-traceability](../ov-research-traceability.md).
