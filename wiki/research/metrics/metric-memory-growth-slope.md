---
id: metric-memory-growth-slope
type: metric
title: "Memory growth slope over long sessions"
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
unit: MiB/h
definition: "Theil-Sen slope of tree private commit versus time over a soak run, excluding the first settle period."
boundary_start: "End of soak settle period"
boundary_end: "End of soak run"
method: "Sampled tree private commit (1 s, decimated to 1 min medians) regressed on time with Theil-Sen; one slope per trial."
tool: "Rust sampler + Python analysis"
normalization: "MiB per hour"
support: unverified
phase: phase-p6-benchmark-harness
tags:
  - research
  - metric
unverified:
  - claim: "Theil–Sen method citation verified"
    verify_in: phase-p8-research-paper
---

# Memory growth slope over long sessions

| Field | Value |
|---|---|
| Unit | MiB/h |
| Support | `unverified`. Nothing has been measured yet |
| Validated in | `phase-p6-benchmark-harness` |

**Definition.** Theil-Sen slope of tree private commit versus time over a soak run, excluding the first settle period.

**Boundaries.** Start: End of soak settle period. End: End of soak run.

**Method.** Sampled tree private commit (1 s, decimated to 1 min medians) regressed on time with Theil-Sen; one slope per trial.

**Tool.** Rust sampler + Python analysis

**Normalisation.** MiB per hour

## Notes
The slope uses [metric-tree-private-commit](metric-tree-private-commit.md) samples. Theil–Sen is chosen because it is robust to single spikes. The choice is a project decision, and the method citation is still to be checked: UNVERIFIED[phase-p8-research-paper].

## Used by
Experiments and hypotheses that reference this metric are listed in [ov-research-traceability](../ov-research-traceability.md).
