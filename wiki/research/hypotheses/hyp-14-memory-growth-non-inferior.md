---
id: hyp-14
type: hypothesis
title: "Ferrum's memory growth over long sessions is non-inferior to Edge and Chrome"
status: draft
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/research/measurement-methodology.md
  - raw/research/related-work-seed.md
related:
  - rq-07
  - exp-reliability
  - ov-research-statistical-analysis-plan
approvable: true
rq: rq-07
prediction: "In the wl-frequent-nav soak, the per-trial memory growth slope of cfg-ferrum-nolifecycle exceeds that of cfg-edge and of cfg-chrome by less than the margin."
null_hypothesis: "Ferrum's slope exceeds the competitor's by at least the margin."
metrics:
  - metric-memory-growth-slope
  - metric-crash-count
  - metric-nav-failure-rate
experiments:
  - exp-reliability
practical_threshold: "Margin: 10 MiB/h (proposed)."
phase: phase-p6-benchmark-harness
tags:
  - research
  - preregistration-candidate
---

# HYP-14: Ferrum's memory growth over long sessions is non-inferior to Edge and Chrome

Research question: [rq-07](../questions/rq-07-reliability.md). Status `draft`. It becomes `preregistered` only when the owner approves it at the pre-registration freeze ([ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md)).

| | |
|---|---|
| **Prediction (H1)** | In the wl-frequent-nav soak, the per-trial memory growth slope of cfg-ferrum-nolifecycle exceeds that of cfg-edge and of cfg-chrome by less than the margin. |
| **Null (H0)** | Ferrum's slope exceeds the competitor's by at least the margin. |
| **Practical threshold** | Margin: 10 MiB/h (proposed). |
| **Metrics** | [metric-memory-growth-slope](../metrics/metric-memory-growth-slope.md), [metric-crash-count](../metrics/metric-crash-count.md), [metric-nav-failure-rate](../metrics/metric-nav-failure-rate.md) |
| **Experiments** | [exp-reliability](../experiments/exp-reliability.md) |

## Rationale

Ferrum adds Rust-side state per tab and per navigation (telemetry and network log buffers). A leak there would show up as growth. This is an expectation, not a source-backed fact.

## Decision rule

The statistic, the error control (Holm within the research question's family) and the four-way outcome classification are defined in the analysis plan ([ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md)): practically meaningful, detectable but not meaningful, inconclusive, or evidence of no meaningful difference. A verdict status (`supported`, `not-supported` or `inconclusive`) is set only after the linked experiment is `analyzed` with `results_ref` pointing into `raw/bench/`.

## Integrity notes

- No data exists. Nothing on this page is a result.
- Thresholds marked "proposed" may change only before the pre-registration freeze. Every change gets a `decide` or `plan` log entry, and any later change makes the analysis exploratory.
