---
id: hyp-06
type: hypothesis
title: "Ferrum's rendering smoothness is non-inferior to Chrome and Edge"
status: draft
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/research/measurement-methodology.md
  - raw/research/related-work-seed.md
related:
  - rq-02
  - exp-rendering
  - ov-research-statistical-analysis-plan
approvable: true
rq: rq-02
prediction: "On wl-continuous-scroll and wl-canvas-webgl, the per-trial p95 frame presentation interval of cfg-ferrum-nolifecycle is no more than the margin above the competitor's, and its frame miss rate is no more than the margin above the competitor's."
null_hypothesis: "Ferrum exceeds the competitor by at least the margin on either metric."
metrics:
  - metric-frame-interval
  - metric-frame-miss-rate
  - metric-canvas-throughput
  - metric-loaf-blocking
experiments:
  - exp-rendering
practical_threshold: "Margins: 10% of the competitor's p95 frame interval; +1 percentage point frame miss rate (proposed)."
phase: phase-p6-benchmark-harness
tags:
  - research
  - preregistration-candidate
unverified:
  - claim: "An embedded WebView2 may composite through a different present path from a browser window. That difference"
    verify_in: phase-p6-benchmark-harness
---

# HYP-06: Ferrum's rendering smoothness is non-inferior to Chrome and Edge

Research question: [rq-02](../questions/rq-02-responsiveness.md). Status `draft`. It becomes `preregistered` only when the owner approves it at the pre-registration freeze ([ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md)).

| | |
|---|---|
| **Prediction (H1)** | On wl-continuous-scroll and wl-canvas-webgl, the per-trial p95 frame presentation interval of cfg-ferrum-nolifecycle is no more than the margin above the competitor's, and its frame miss rate is no more than the margin above the competitor's. |
| **Null (H0)** | Ferrum exceeds the competitor by at least the margin on either metric. |
| **Practical threshold** | Margins: 10% of the competitor's p95 frame interval; +1 percentage point frame miss rate (proposed). |
| **Metrics** | [metric-frame-interval](../metrics/metric-frame-interval.md), [metric-frame-miss-rate](../metrics/metric-frame-miss-rate.md), [metric-canvas-throughput](../metrics/metric-canvas-throughput.md), [metric-loaf-blocking](../metrics/metric-loaf-blocking.md) |
| **Experiments** | [exp-rendering](../experiments/exp-rendering.md) |

## Rationale

An embedded WebView2 may composite through a different present path from a browser window. That difference is UNVERIFIED[phase-p6-benchmark-harness] ([measurement note](../../raw/research/measurement-methodology.md) §4.1).

## Decision rule

The statistic, the error control (Holm within the research question's family) and the four-way outcome classification are defined in the analysis plan ([ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md)): practically meaningful, detectable but not meaningful, inconclusive, or evidence of no meaningful difference. A verdict status (`supported`, `not-supported` or `inconclusive`) is set only after the linked experiment is `analyzed` with `results_ref` pointing into `raw/bench/`.

## Integrity notes

- No data exists. Nothing on this page is a result.
- Thresholds marked "proposed" may change only before the pre-registration freeze. Every change gets a `decide` or `plan` log entry, and any later change makes the analysis exploratory.
