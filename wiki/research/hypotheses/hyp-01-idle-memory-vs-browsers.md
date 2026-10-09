---
id: hyp-01
type: hypothesis
title: "Ferrum uses less tree private commit than Chrome and Edge"
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
prediction: "On wl-static-info (idle window) and wl-multi-active, the median per-trial time-averaged tree private commit of cfg-ferrum-nolifecycle is lower than that of cfg-chrome and of cfg-edge (as-shipped defaults)."
null_hypothesis: "The median tree private commit of cfg-ferrum-nolifecycle is greater than or equal to that of the competitor."
metrics:
  - metric-tree-private-commit
  - metric-tree-private-working-set
  - metric-process-count
experiments:
  - exp-baseline-footprint
practical_threshold: "Relative median difference of at least 10% (proposed) in Ferrum's favour; classification per ov-research-statistical-analysis-plan §6."
phase: phase-p6-benchmark-harness
tags:
  - research
  - preregistration-candidate
unverified:
  - claim: "Whether those features cost measurable memory"
    verify_in: phase-p6-benchmark-harness
---

# HYP-01: Ferrum uses less tree private commit than Chrome and Edge

Research question: [rq-01](../questions/rq-01-resource-footprint.md). Status `draft`. It becomes `preregistered` only when the owner approves it at the pre-registration freeze ([ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md)).

| | |
|---|---|
| **Prediction (H1)** | On wl-static-info (idle window) and wl-multi-active, the median per-trial time-averaged tree private commit of cfg-ferrum-nolifecycle is lower than that of cfg-chrome and of cfg-edge (as-shipped defaults). |
| **Null (H0)** | The median tree private commit of cfg-ferrum-nolifecycle is greater than or equal to that of the competitor. |
| **Practical threshold** | Relative median difference of at least 10% (proposed) in Ferrum's favour; classification per ov-research-statistical-analysis-plan §6. |
| **Metrics** | [metric-tree-private-commit](../metrics/metric-tree-private-commit.md), [metric-tree-private-working-set](../metrics/metric-tree-private-working-set.md), [metric-process-count](../metrics/metric-process-count.md) |
| **Experiments** | [exp-baseline-footprint](../experiments/exp-baseline-footprint.md) |

## Rationale

Ferrum leaves out browser UI features such as extensions and sync. Whether those features cost measurable memory is UNVERIFIED[phase-p6-benchmark-harness]. Against that, Ferrum adds a trusted shell WebView (`adr-0007`), and as shipped, Chrome and Edge include memory-saving features (Edge sleeping tabs are on by default; [measurement note](../../raw/research/measurement-methodology.md) §6.1, VERIFIED). The outcome is genuinely uncertain.

## Decision rule

The statistic, the error control (Holm within the research question's family) and the four-way outcome classification are defined in the analysis plan ([ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md)): practically meaningful, detectable but not meaningful, inconclusive, or evidence of no meaningful difference. A verdict status (`supported`, `not-supported` or `inconclusive`) is set only after the linked experiment is `analyzed` with `results_ref` pointing into `raw/bench/`.

## Integrity notes

- No data exists. Nothing on this page is a result.
- Thresholds marked "proposed" may change only before the pre-registration freeze. Every change gets a `decide` or `plan` log entry, and any later change makes the analysis exploratory.
