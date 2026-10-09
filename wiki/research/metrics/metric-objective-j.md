---
id: metric-objective-j
type: metric
title: "Lifecycle objective J = aM + bE + gL"
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
unit: dimensionless
definition: "Per trial: J = alpha*M + beta*E + gamma*L where M, E, L are the trial's memory, energy and restoration-latency summaries each divided by the same block's cfg-ferrum-nolifecycle value; alpha+beta+gamma = 1, all >= 0."
boundary_start: "Workload measurement window start"
boundary_end: "Workload measurement window end"
method: "Computed in the analysis scripts from metric-tree-private-commit (time-average), energy metric (wall if supported, else modeled package, else term dropped with beta = 0 and weights renormalised), metric-restore-latency (mean). Primary weight vector pre-registered; sensitivity over a simplex grid."
tool: "Python analysis scripts (analysis/scripts/, TBD)"
normalization: "Reference configuration = 1 for each term, so J(reference) = 1"
support: unverified
phase: phase-p7-lifecycle
tags:
  - research
  - metric
---

# Lifecycle objective J = aM + bE + gL

| Field | Value |
|---|---|
| Unit | dimensionless |
| Support | `unverified`. Nothing has been measured yet |
| Validated in | `phase-p7-lifecycle` |

**Definition.** Per trial: J = alpha*M + beta*E + gamma*L where M, E, L are the trial's memory, energy and restoration-latency summaries each divided by the same block's cfg-ferrum-nolifecycle value; alpha+beta+gamma = 1, all >= 0.

**Boundaries.** Start: Workload measurement window start. End: Workload measurement window end.

**Method.** Computed in the analysis scripts from metric-tree-private-commit (time-average), energy metric (wall if supported, else modeled package, else term dropped with beta = 0 and weights renormalised), metric-restore-latency (mean). Primary weight vector pre-registered; sensitivity over a simplex grid.

**Tool.** Python analysis scripts (analysis/scripts/, TBD)

**Normalisation.** Reference configuration = 1 for each term, so J(reference) = 1

## Notes
Full definition, normalisation rationale and the weight-selection procedure are in [ov-research-objective-function](../ov-research-objective-function.md). The objective function is **not** claimed to be novel.

## Used by
Experiments and hypotheses that reference this metric are listed in [ov-research-traceability](../ov-research-traceability.md).
