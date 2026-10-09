---
id: hyp-02
type: hypothesis
title: "Ferrum's container overhead over the minimal Tauri baseline is small (non-inferiority)"
status: draft
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/research/measurement-methodology.md
  - raw/research/related-work-seed.md
related:
  - rq-01
  - exp-baseline-footprint
  - ov-research-statistical-analysis-plan
approvable: true
rq: rq-01
prediction: "The median idle tree private commit of cfg-ferrum-nolifecycle on wl-static-info exceeds that of cfg-tauri-baseline by less than the non-inferiority margin."
null_hypothesis: "Ferrum's excess over the baseline is greater than or equal to the margin."
metrics:
  - metric-tree-private-commit
  - metric-tree-cpu-time
experiments:
  - exp-baseline-footprint
practical_threshold: "Non-inferiority margin: 20% of the baseline median (proposed). The test is the upper bound of the one-sided 95% CI of the ratio."
phase: phase-p6-benchmark-harness
tags:
  - research
  - preregistration-candidate
---

# HYP-02: Ferrum's container overhead over the minimal Tauri baseline is small (non-inferiority)

Research question: [rq-01](../questions/rq-01-resource-footprint.md). Status `draft`. It becomes `preregistered` only when the owner approves it at the pre-registration freeze ([ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md)).

| | |
|---|---|
| **Prediction (H1)** | The median idle tree private commit of cfg-ferrum-nolifecycle on wl-static-info exceeds that of cfg-tauri-baseline by less than the non-inferiority margin. |
| **Null (H0)** | Ferrum's excess over the baseline is greater than or equal to the margin. |
| **Practical threshold** | Non-inferiority margin: 20% of the baseline median (proposed). The test is the upper bound of the one-sided 95% CI of the ratio. |
| **Metrics** | [metric-tree-private-commit](../metrics/metric-tree-private-commit.md), [metric-tree-cpu-time](../metrics/metric-tree-cpu-time.md) |
| **Experiments** | [exp-baseline-footprint](../experiments/exp-baseline-footprint.md) |

## Rationale

The baseline hosts one WebView. Ferrum hosts a shell WebView plus a tab WebView and adds Rust components. This hypothesis measures what Ferrum's features cost on top of the WebView2 runtime itself. The margin is a value judgement and is frozen at pre-registration.

## Decision rule

The statistic, the error control (Holm within the research question's family) and the four-way outcome classification are defined in the analysis plan ([ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md)): practically meaningful, detectable but not meaningful, inconclusive, or evidence of no meaningful difference. A verdict status (`supported`, `not-supported` or `inconclusive`) is set only after the linked experiment is `analyzed` with `results_ref` pointing into `raw/bench/`.

## Integrity notes

- No data exists. Nothing on this page is a result.
- Thresholds marked "proposed" may change only before the pre-registration freeze. Every change gets a `decide` or `plan` log entry, and any later change makes the analysis exploratory.
