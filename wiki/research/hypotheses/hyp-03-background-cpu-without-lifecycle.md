---
id: hyp-03
type: hypothesis
title: "Without lifecycle management Ferrum spends more background CPU than Chrome and Edge"
status: draft
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/research/measurement-methodology.md
  - raw/research/related-work-seed.md
  - raw/research/tauri-webview2-capabilities.md
related:
  - rq-01
  - exp-baseline-footprint
  - ov-research-statistical-analysis-plan
approvable: true
rq: rq-01
prediction: "On wl-many-background, cfg-ferrum-nolifecycle accumulates more tree CPU time per minute during the background window than cfg-chrome and cfg-edge (as-shipped)."
null_hypothesis: "Ferrum's background CPU time per minute is less than or equal to the competitor's."
metrics:
  - metric-tree-cpu-time
  - metric-tree-cpu-cycles
experiments:
  - exp-baseline-footprint
practical_threshold: "Relative difference of at least 10% (proposed)."
phase: phase-p6-benchmark-harness
tags:
  - research
  - preregistration-candidate
unverified:
  - claim: "Whether WebView2 throttles a hidden child WebView by itself"
    verify_in: phase-p7-lifecycle
---

# HYP-03: Without lifecycle management Ferrum spends more background CPU than Chrome and Edge

Research question: [rq-01](../questions/rq-01-resource-footprint.md). Status `draft`. It becomes `preregistered` only when the owner approves it at the pre-registration freeze ([ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md)).

| | |
|---|---|
| **Prediction (H1)** | On wl-many-background, cfg-ferrum-nolifecycle accumulates more tree CPU time per minute during the background window than cfg-chrome and cfg-edge (as-shipped). |
| **Null (H0)** | Ferrum's background CPU time per minute is less than or equal to the competitor's. |
| **Practical threshold** | Relative difference of at least 10% (proposed). |
| **Metrics** | [metric-tree-cpu-time](../metrics/metric-tree-cpu-time.md), [metric-tree-cpu-cycles](../metrics/metric-tree-cpu-cycles.md) |
| **Experiments** | [exp-baseline-footprint](../experiments/exp-baseline-footprint.md) |

## Rationale

Chrome freezes background tabs by default when the policy is unset, and Edge sleeping tabs are on by default ([measurement note](../../raw/research/measurement-methodology.md) §6.1, VERIFIED). Tauri's `background_throttling` is unsupported on Windows ([Tauri/WebView2 note](../../raw/research/tauri-webview2-capabilities.md) §9, VERIFIED). Whether WebView2 throttles a hidden child WebView by itself is UNVERIFIED[phase-p7-lifecycle]. This hypothesis motivates [rq-04](../questions/rq-04-lifecycle-policies.md).

## Decision rule

The statistic, the error control (Holm within the research question's family) and the four-way outcome classification are defined in the analysis plan ([ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md)): practically meaningful, detectable but not meaningful, inconclusive, or evidence of no meaningful difference. A verdict status (`supported`, `not-supported` or `inconclusive`) is set only after the linked experiment is `analyzed` with `results_ref` pointing into `raw/bench/`.

## Integrity notes

- No data exists. Nothing on this page is a result.
- Thresholds marked "proposed" may change only before the pre-registration freeze. Every change gets a `decide` or `plan` log entry, and any later change makes the analysis exploratory.
