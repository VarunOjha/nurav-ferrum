---
id: hyp-09
type: hypothesis
title: "The adaptive policy achieves the lowest objective J"
status: draft
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/research/measurement-methodology.md
  - raw/research/related-work-seed.md
related:
  - rq-04
  - exp-lifecycle-policies
  - ov-research-statistical-analysis-plan
approvable: true
rq: rq-04
prediction: "Under the pre-registered primary weight vector, cfg-ferrum-adaptive has a lower median J than cfg-ferrum-fixed-idle and cfg-ferrum-mempressure on wl-many-background and wl-session-churn, and it has the lowest median J on at least two thirds of the pre-registered weight-simplex grid points."
null_hypothesis: "On at least one of the two workloads, cfg-ferrum-adaptive's median J is greater than or equal to that of a comparison policy under the primary weights."
metrics:
  - metric-objective-j
  - metric-tree-private-commit
  - metric-restore-latency
  - metric-cpu-package-energy
  - metric-wall-energy
experiments:
  - exp-lifecycle-policies
practical_threshold: "Delta J of at least 0.05 (J is normalised so the reference configuration equals 1; proposed)."
phase: phase-p7-lifecycle
tags:
  - research
  - preregistration-candidate
---

# HYP-09: The adaptive policy achieves the lowest objective J

Research question: [rq-04](../questions/rq-04-lifecycle-policies.md). Status `draft`. It becomes `preregistered` only when the owner approves it at the pre-registration freeze ([ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md)).

| | |
|---|---|
| **Prediction (H1)** | Under the pre-registered primary weight vector, cfg-ferrum-adaptive has a lower median J than cfg-ferrum-fixed-idle and cfg-ferrum-mempressure on wl-many-background and wl-session-churn, and it has the lowest median J on at least two thirds of the pre-registered weight-simplex grid points. |
| **Null (H0)** | On at least one of the two workloads, cfg-ferrum-adaptive's median J is greater than or equal to that of a comparison policy under the primary weights. |
| **Practical threshold** | Delta J of at least 0.05 (J is normalised so the reference configuration equals 1; proposed). |
| **Metrics** | [metric-objective-j](../metrics/metric-objective-j.md), [metric-tree-private-commit](../metrics/metric-tree-private-commit.md), [metric-restore-latency](../metrics/metric-restore-latency.md), [metric-cpu-package-energy](../metrics/metric-cpu-package-energy.md), [metric-wall-energy](../metrics/metric-wall-energy.md) |
| **Experiments** | [exp-lifecycle-policies](../experiments/exp-lifecycle-policies.md) |

## Rationale

The adaptive policy weighs restore cost, memory size and predicted reuse, an idea close to GreedyDual-Size ([seed](../../raw/research/related-work-seed.md) G1). No novelty is claimed (see [ov-research-objective-function](../ov-research-objective-function.md)).

## Decision rule

The statistic, the error control (Holm within the research question's family) and the four-way outcome classification are defined in the analysis plan ([ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md)): practically meaningful, detectable but not meaningful, inconclusive, or evidence of no meaningful difference. A verdict status (`supported`, `not-supported` or `inconclusive`) is set only after the linked experiment is `analyzed` with `results_ref` pointing into `raw/bench/`.

## Integrity notes

- No data exists. Nothing on this page is a result.
- Thresholds marked "proposed" may change only before the pre-registration freeze. Every change gets a `decide` or `plan` log entry, and any later change makes the analysis exploratory.
