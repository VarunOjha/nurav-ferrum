---
id: hyp-08
type: hypothesis
title: "The adaptive policy reduces memory relative to no lifecycle management"
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
prediction: "On wl-many-background, the median time-averaged tree private commit under cfg-ferrum-adaptive is lower than under cfg-ferrum-nolifecycle."
null_hypothesis: "Under cfg-ferrum-adaptive it is greater than or equal to that under cfg-ferrum-nolifecycle."
metrics:
  - metric-tree-private-commit
  - metric-lifecycle-transitions
experiments:
  - exp-lifecycle-policies
practical_threshold: "Relative reduction of at least 15% (proposed)."
phase: phase-p7-lifecycle
tags:
  - research
  - preregistration-candidate
unverified:
  - claim: "TrySuspend and MemoryUsageTargetLevel are best-effort (seed C1, VERIFIED), and how much they reclaim"
    verify_in: phase-p7-lifecycle
---

# HYP-08: The adaptive policy reduces memory relative to no lifecycle management

Research question: [rq-04](../questions/rq-04-lifecycle-policies.md). Status `draft`. It becomes `preregistered` only when the owner approves it at the pre-registration freeze ([ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md)).

| | |
|---|---|
| **Prediction (H1)** | On wl-many-background, the median time-averaged tree private commit under cfg-ferrum-adaptive is lower than under cfg-ferrum-nolifecycle. |
| **Null (H0)** | Under cfg-ferrum-adaptive it is greater than or equal to that under cfg-ferrum-nolifecycle. |
| **Practical threshold** | Relative reduction of at least 15% (proposed). |
| **Metrics** | [metric-tree-private-commit](../metrics/metric-tree-private-commit.md), [metric-lifecycle-transitions](../metrics/metric-lifecycle-transitions.md) |
| **Experiments** | [exp-lifecycle-policies](../experiments/exp-lifecycle-policies.md) |

## Rationale

Discarding or suspending background WebViews should release renderer memory. TrySuspend and MemoryUsageTargetLevel are best-effort ([seed](../../raw/research/related-work-seed.md) C1, VERIFIED), and how much they reclaim is UNVERIFIED[phase-p7-lifecycle].

## Decision rule

The statistic, the error control (Holm within the research question's family) and the four-way outcome classification are defined in the analysis plan ([ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md)): practically meaningful, detectable but not meaningful, inconclusive, or evidence of no meaningful difference. A verdict status (`supported`, `not-supported` or `inconclusive`) is set only after the linked experiment is `analyzed` with `results_ref` pointing into `raw/bench/`.

## Integrity notes

- No data exists. Nothing on this page is a result.
- Thresholds marked "proposed" may change only before the pre-registration freeze. Every change gets a `decide` or `plan` log entry, and any later change makes the analysis exploratory.
