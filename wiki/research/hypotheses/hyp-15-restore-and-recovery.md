---
id: hyp-15
type: hypothesis
title: "Ferrum restores sessions and recovers from renderer crashes reliably"
status: draft
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/research/measurement-methodology.md
  - raw/research/related-work-seed.md
  - raw/research/tauri-webview2-capabilities.md
related:
  - rq-07
  - exp-reliability
  - ov-research-statistical-analysis-plan
approvable: true
rq: rq-07
prediction: "The lower bound of the exact 95% binomial CI of cfg-ferrum-nolifecycle's session restoration success rate on wl-session-churn is at least 0.95, and every induced renderer crash is followed by recovery within the timeout."
null_hypothesis: "The lower bound is below 0.95, or at least one induced crash is not recovered."
metrics:
  - metric-restore-success-rate
  - metric-recovery-time
  - metric-crash-count
experiments:
  - exp-reliability
practical_threshold: "Lower CI bound of 0.95 (proposed); 100% recovery from induced crashes."
phase: phase-p6-benchmark-harness
tags:
  - research
  - preregistration-candidate
---

# HYP-15: Ferrum restores sessions and recovers from renderer crashes reliably

Research question: [rq-07](../questions/rq-07-reliability.md). Status `draft`. It becomes `preregistered` only when the owner approves it at the pre-registration freeze ([ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md)).

| | |
|---|---|
| **Prediction (H1)** | The lower bound of the exact 95% binomial CI of cfg-ferrum-nolifecycle's session restoration success rate on wl-session-churn is at least 0.95, and every induced renderer crash is followed by recovery within the timeout. |
| **Null (H0)** | The lower bound is below 0.95, or at least one induced crash is not recovered. |
| **Practical threshold** | Lower CI bound of 0.95 (proposed); 100% recovery from induced crashes. |
| **Metrics** | [metric-restore-success-rate](../metrics/metric-restore-success-rate.md), [metric-recovery-time](../metrics/metric-recovery-time.md), [metric-crash-count](../metrics/metric-crash-count.md) |
| **Experiments** | [exp-reliability](../experiments/exp-reliability.md) |

## Rationale

Master prompt §11 requires application recovery after renderer crashes. ProcessFailed is reachable only through raw COM ([Tauri/WebView2 note](../../raw/research/tauri-webview2-capabilities.md) §6).

## Decision rule

The statistic, the error control (Holm within the research question's family) and the four-way outcome classification are defined in the analysis plan ([ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md)): practically meaningful, detectable but not meaningful, inconclusive, or evidence of no meaningful difference. A verdict status (`supported`, `not-supported` or `inconclusive`) is set only after the linked experiment is `analyzed` with `results_ref` pointing into `raw/bench/`.

## Integrity notes

- No data exists. Nothing on this page is a result.
- Thresholds marked "proposed" may change only before the pre-registration freeze. Every change gets a `decide` or `plan` log entry, and any later change makes the analysis exploratory.
