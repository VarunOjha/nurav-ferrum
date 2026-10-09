---
id: hyp-05
type: hypothesis
title: "Ferrum's navigation latency is non-inferior to Chrome and Edge"
status: draft
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/research/measurement-methodology.md
  - raw/research/related-work-seed.md
related:
  - rq-02
  - exp-navigation
  - ov-research-statistical-analysis-plan
approvable: true
rq: rq-02
prediction: "For every navigation scenario of wl-frequent-nav, the median per-trial navigation latency of cfg-ferrum-nolifecycle is no more than the margin above that of cfg-chrome and of cfg-edge."
null_hypothesis: "Ferrum's median navigation latency exceeds the competitor's by at least the margin in at least one scenario."
metrics:
  - metric-nav-latency
  - metric-nav-failure-rate
experiments:
  - exp-navigation
practical_threshold: "Non-inferiority margin: 10% of the competitor median per scenario (proposed)."
phase: phase-p6-benchmark-harness
tags:
  - research
  - preregistration-candidate
---

# HYP-05: Ferrum's navigation latency is non-inferior to Chrome and Edge

Research question: [rq-02](../questions/rq-02-responsiveness.md). Status `draft`. It becomes `preregistered` only when the owner approves it at the pre-registration freeze ([ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md)).

| | |
|---|---|
| **Prediction (H1)** | For every navigation scenario of wl-frequent-nav, the median per-trial navigation latency of cfg-ferrum-nolifecycle is no more than the margin above that of cfg-chrome and of cfg-edge. |
| **Null (H0)** | Ferrum's median navigation latency exceeds the competitor's by at least the margin in at least one scenario. |
| **Practical threshold** | Non-inferiority margin: 10% of the competitor median per scenario (proposed). |
| **Metrics** | [metric-nav-latency](../metrics/metric-nav-latency.md), [metric-nav-failure-rate](../metrics/metric-nav-failure-rate.md) |
| **Experiments** | [exp-navigation](../experiments/exp-navigation.md) |

## Rationale

All products use the Chromium engine (version 154 observed, [raw/01-scoping-decisions.md](../../raw/01-scoping-decisions.md)). Ferrum adds navigation interception hooks in the navigation path (`comp-security-engine`).

## Decision rule

The statistic, the error control (Holm within the research question's family) and the four-way outcome classification are defined in the analysis plan ([ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md)): practically meaningful, detectable but not meaningful, inconclusive, or evidence of no meaningful difference. A verdict status (`supported`, `not-supported` or `inconclusive`) is set only after the linked experiment is `analyzed` with `results_ref` pointing into `raw/bench/`.

## Integrity notes

- No data exists. Nothing on this page is a result.
- Thresholds marked "proposed" may change only before the pre-registration freeze. Every change gets a `decide` or `plan` log entry, and any later change makes the analysis exploratory.
