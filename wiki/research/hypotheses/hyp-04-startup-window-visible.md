---
id: hyp-04
type: hypothesis
title: "Ferrum shows its first window sooner than Chrome and Edge"
status: draft
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/research/measurement-methodology.md
  - raw/research/related-work-seed.md
related:
  - rq-02
  - exp-startup
  - ov-research-statistical-analysis-plan
approvable: true
rq: rq-02
prediction: "In fresh-profile starts, the median T0-to-T1 (first window visible) latency of cfg-ferrum-nolifecycle is lower than that of cfg-chrome and cfg-edge (Edge Startup Boost disabled)."
null_hypothesis: "Ferrum's median T0-to-T1 is greater than or equal to the competitor's."
metrics:
  - metric-startup-window-visible
  - metric-startup-fcp
  - metric-startup-lcp
experiments:
  - exp-startup
practical_threshold: "At least 10% and at least 50 ms difference in medians (proposed)."
phase: phase-p6-benchmark-harness
tags:
  - research
  - preregistration-candidate
unverified:
  - claim: "A minimal shell creates its first window before a full browser profile would load (startup advantage expectation)"
    verify_in: phase-p6-benchmark-harness
---

# HYP-04: Ferrum shows its first window sooner than Chrome and Edge

Research question: [rq-02](../questions/rq-02-responsiveness.md). Status `draft`. It becomes `preregistered` only when the owner approves it at the pre-registration freeze ([ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md)).

| | |
|---|---|
| **Prediction (H1)** | In fresh-profile starts, the median T0-to-T1 (first window visible) latency of cfg-ferrum-nolifecycle is lower than that of cfg-chrome and cfg-edge (Edge Startup Boost disabled). |
| **Null (H0)** | Ferrum's median T0-to-T1 is greater than or equal to the competitor's. |
| **Practical threshold** | At least 10% and at least 50 ms difference in medians (proposed). |
| **Metrics** | [metric-startup-window-visible](../metrics/metric-startup-window-visible.md), [metric-startup-fcp](../metrics/metric-startup-fcp.md), [metric-startup-lcp](../metrics/metric-startup-lcp.md) |
| **Experiments** | [exp-startup](../experiments/exp-startup.md) |

## Rationale

A minimal shell might create its window before loading a full browser profile. This is a plausible expectation, not a source-backed fact: UNVERIFIED[phase-p6-benchmark-harness]. FCP is reported alongside because a visible but blank window is not useful to a user.

## Decision rule

The statistic, the error control (Holm within the research question's family) and the four-way outcome classification are defined in the analysis plan ([ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md)): practically meaningful, detectable but not meaningful, inconclusive, or evidence of no meaningful difference. A verdict status (`supported`, `not-supported` or `inconclusive`) is set only after the linked experiment is `analyzed` with `results_ref` pointing into `raw/bench/`.

## Integrity notes

- No data exists. Nothing on this page is a result.
- Thresholds marked "proposed" may change only before the pre-registration freeze. Every change gets a `decide` or `plan` log entry, and any later change makes the analysis exploratory.
