---
id: exp-rendering
type: experiment
title: "Rendering smoothness"
status: designed
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/research/measurement-methodology.md
  - raw/research/related-work-seed.md
  - raw/research/tauri-webview2-capabilities.md
related:
  - hyp-06
  - ov-research-configurations
  - ov-research-fairness-protocol
  - comp-benchmark-harness
  - comp-research-analysis
  - phase-p6-benchmark-harness
  - phase-p7-lifecycle
approvable: true
hypotheses:
  - hyp-06
workloads:
  - wl-continuous-scroll
  - wl-canvas-webgl
  - wl-large-dom
  - wl-spa-js-heavy
configurations:
  - cfg-chrome
  - cfg-edge
  - cfg-tauri-baseline
  - cfg-ferrum-nolifecycle
  - cfg-ferrum-adaptive
metrics:
  - metric-frame-interval
  - metric-frame-miss-rate
  - metric-loaf-blocking
  - metric-canvas-throughput
  - metric-tree-cpu-time
trials:
  target: 30
  warmup: 2
  order: randomized
analysis: "Per-trial p95 frame interval and miss rate; block-paired bootstrap CI of ratio; non-inferiority via one-sided bound; Holm within rq-02 family."
phase: phase-p6-benchmark-harness
fairness_controls:
  - "as-shipped defaults headline; matched configs labelled secondary"
  - "fresh profile per launch; Job Object attribution"
  - "identical viewport, window state, display mode, network (loopback fixtures), cache policy, no extensions, no logins"
  - "versions and resource-saving policies recorded per trial"
  - "same CDP connection path for all products"
tags:
  - research
  - experiment
---

# Rendering smoothness

**Status:** `designed`. No runs have happened. **Runs in:** `phase-p6-benchmark-harness`.

| | |
|---|---|
| Hypotheses | [hyp-06](../hypotheses/hyp-06-rendering-non-inferiority.md) |
| Workloads | [wl-continuous-scroll](../workloads/wl-continuous-scroll.md), [wl-canvas-webgl](../workloads/wl-canvas-webgl.md), [wl-large-dom](../workloads/wl-large-dom.md), [wl-spa-js-heavy](../workloads/wl-spa-js-heavy.md) |
| Configurations | `cfg-chrome`, `cfg-edge`, `cfg-tauri-baseline`, `cfg-ferrum-nolifecycle`; `cfg-ferrum-adaptive` only in the proposed P7 re-run campaign C2b (see below) (defined in [ov-research-configurations](../ov-research-configurations.md)) |
| Metrics | [metric-frame-interval](../metrics/metric-frame-interval.md), [metric-frame-miss-rate](../metrics/metric-frame-miss-rate.md), [metric-loaf-blocking](../metrics/metric-loaf-blocking.md), [metric-canvas-throughput](../metrics/metric-canvas-throughput.md), [metric-tree-cpu-time](../metrics/metric-tree-cpu-time.md) |
| Trials | target 30 per configuration x workload cell, 2 warm-up per cell, order `randomized` |

## Procedure

1. Run PresentMon in a separate elevated sampler process that targets the product's GPU process. The product itself is never elevated.
2. Record PresentMode for each product. If the present paths differ, report it as a construct-validity threat.
3. Use a fixed display mode (resolution and refresh rate), a single monitor, and an unoccluded window of the same size for every product.

## Analysis

Per-trial p95 frame interval and miss rate; block-paired bootstrap CI of ratio; non-inferiority via one-sided bound; Holm within rq-02 family.

The full rules are in [ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md): pre-registration, failed-run retention, percentile reporting and multiple comparisons.

## Campaign C2b: adaptive configuration (proposed, P7)

`cfg-ferrum-adaptive` (configuration E, master prompt §8) cannot run in campaign C1 because the adaptive policy does not exist until `phase-p7-lifecycle`. So that E is compared with A–D on this dimension, this experiment is re-run in P7 as **campaign C2b** (proposed): the full configuration set of this page, `cfg-ferrum-adaptive` included, in new randomised complete blocks with versions pinned for that campaign. C2b blocks are analysed on their own and are never pooled with C1 blocks, because versions and machine state may differ between campaigns. The comparisons of interest are E vs A, B, C and D, to check whether adaptive lifecycle management costs responsiveness, reliability or energy relative to the browsers. The coverage matrix and the open owner question (R-Q15 = Q-208) are in [ov-research-configurations](../ov-research-configurations.md#coverage-matrix-a-to-e). The P7 phase task for C2b is p7.14 in [phase-p7-lifecycle](../../phases/phase-p7-lifecycle.md), conditional on the owner's answer to Q-208.

## Fairness controls

Every trial follows [ov-research-fairness-protocol](../ov-research-fairness-protocol.md): the per-trial environment record, version pinning, the same CDP path for every product, window state, and job-object attribution.

## Outputs (all TBD)

- Raw data: `wiki/raw/bench/<run-id>/` (TBD; no runs yet).
- Analysis script: `analysis/scripts/rendering.py` (TBD).
- Figures: `analysis/figures/rendering-*.pdf` (TBD).
- `results_ref` stays absent until the status reaches `complete`.
