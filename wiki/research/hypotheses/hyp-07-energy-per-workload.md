---
id: hyp-07
type: hypothesis
title: "Ferrum uses less energy per completed workload than Chrome and Edge (conditional on a supported energy metric)"
status: draft
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/research/measurement-methodology.md
  - raw/research/related-work-seed.md
related:
  - rq-03
  - exp-energy
  - ov-research-statistical-analysis-plan
approvable: true
rq: rq-03
prediction: "Where an energy metric passes its validation gate, cfg-ferrum-nolifecycle uses less energy per completed workload above idle baseline than cfg-chrome and cfg-edge on wl-static-info (idle) and wl-video-playback."
null_hypothesis: "Ferrum's energy per completed workload is greater than or equal to the competitor's."
metrics:
  - metric-cpu-package-energy
  - metric-wall-energy
  - metric-tree-cpu-time
experiments:
  - exp-energy
practical_threshold: "Relative difference of at least 10% (proposed). Package-energy results are labelled 'modeled CPU-package energy'."
phase: phase-p6-benchmark-harness
tags:
  - research
  - preregistration-candidate
---

# HYP-07: Ferrum uses less energy per completed workload than Chrome and Edge (conditional on a supported energy metric)

Research question: [rq-03](../questions/rq-03-energy.md). Status `draft`. It becomes `preregistered` only when the owner approves it at the pre-registration freeze ([ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md)).

| | |
|---|---|
| **Prediction (H1)** | Where an energy metric passes its validation gate, cfg-ferrum-nolifecycle uses less energy per completed workload above idle baseline than cfg-chrome and cfg-edge on wl-static-info (idle) and wl-video-playback. |
| **Null (H0)** | Ferrum's energy per completed workload is greater than or equal to the competitor's. |
| **Practical threshold** | Relative difference of at least 10% (proposed). Package-energy results are labelled 'modeled CPU-package energy'. |
| **Metrics** | [metric-cpu-package-energy](../metrics/metric-cpu-package-energy.md), [metric-wall-energy](../metrics/metric-wall-energy.md), [metric-tree-cpu-time](../metrics/metric-tree-cpu-time.md) |
| **Experiments** | [exp-energy](../experiments/exp-energy.md) |

## Rationale

Pre-registered **condition**: if neither energy metric reaches `support: supported`, this hypothesis is set to `withdrawn` with the reason logged. It is never reported as 'not supported' and energy is never estimated (master prompt §7). AMD counter limitations: [seed](../../raw/research/related-work-seed.md) E4.

## Decision rule

The statistic, the error control (Holm within the research question's family) and the four-way outcome classification are defined in the analysis plan ([ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md)): practically meaningful, detectable but not meaningful, inconclusive, or evidence of no meaningful difference. A verdict status (`supported`, `not-supported` or `inconclusive`) is set only after the linked experiment is `analyzed` with `results_ref` pointing into `raw/bench/`.

## Integrity notes

- No data exists. Nothing on this page is a result.
- Thresholds marked "proposed" may change only before the pre-registration freeze. Every change gets a `decide` or `plan` log entry, and any later change makes the analysis exploratory.
