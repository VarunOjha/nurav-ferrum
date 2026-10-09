---
id: hyp-10
type: hypothesis
title: "The adaptive policy has lower restoration latency than the fixed idle-time policy"
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
prediction: "On wl-many-background, the per-trial p95 background-tab activation-to-ready latency under cfg-ferrum-adaptive is lower than under cfg-ferrum-fixed-idle."
null_hypothesis: "Under cfg-ferrum-adaptive it is greater than or equal to that under cfg-ferrum-fixed-idle."
metrics:
  - metric-restore-latency
  - metric-lifecycle-transitions
experiments:
  - exp-lifecycle-policies
practical_threshold: "Relative reduction of at least 20% (proposed)."
phase: phase-p7-lifecycle
tags:
  - research
  - preregistration-candidate
---

# HYP-10: The adaptive policy has lower restoration latency than the fixed idle-time policy

Research question: [rq-04](../questions/rq-04-lifecycle-policies.md). Status `draft`. It becomes `preregistered` only when the owner approves it at the pre-registration freeze ([ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md)).

| | |
|---|---|
| **Prediction (H1)** | On wl-many-background, the per-trial p95 background-tab activation-to-ready latency under cfg-ferrum-adaptive is lower than under cfg-ferrum-fixed-idle. |
| **Null (H0)** | Under cfg-ferrum-adaptive it is greater than or equal to that under cfg-ferrum-fixed-idle. |
| **Practical threshold** | Relative reduction of at least 20% (proposed). |
| **Metrics** | [metric-restore-latency](../metrics/metric-restore-latency.md), [metric-lifecycle-transitions](../metrics/metric-lifecycle-transitions.md) |
| **Experiments** | [exp-lifecycle-policies](../experiments/exp-lifecycle-policies.md) |

## Rationale

The adaptive policy is designed to prefer suspending (sleep) over discarding for tabs that are expensive to restore. Edge also distinguishes sleep from discard ([seed](../../raw/research/related-work-seed.md) B2, VERIFIED).

## Decision rule

The statistic, the error control (Holm within the research question's family) and the four-way outcome classification are defined in the analysis plan ([ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md)): practically meaningful, detectable but not meaningful, inconclusive, or evidence of no meaningful difference. A verdict status (`supported`, `not-supported` or `inconclusive`) is set only after the linked experiment is `analyzed` with `results_ref` pointing into `raw/bench/`.

## Integrity notes

- No data exists. Nothing on this page is a result.
- Thresholds marked "proposed" may change only before the pre-registration freeze. Every change gets a `decide` or `plan` log entry, and any later change makes the analysis exploratory.
