---
id: exp-baseline-footprint
type: experiment
title: "Baseline resource footprint"
status: designed
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/research/measurement-methodology.md
  - raw/research/related-work-seed.md
  - raw/research/tauri-webview2-capabilities.md
related:
  - hyp-01
  - hyp-02
  - hyp-03
  - ov-research-configurations
  - ov-research-fairness-protocol
  - comp-benchmark-harness
  - comp-research-analysis
  - phase-p6-benchmark-harness
  - phase-p7-lifecycle
approvable: true
hypotheses:
  - hyp-01
  - hyp-02
  - hyp-03
workloads:
  - wl-static-info
  - wl-spa-js-heavy
  - wl-large-dom
  - wl-multi-active
  - wl-many-background
  - wl-public-supplementary
configurations:
  - cfg-chrome
  - cfg-edge
  - cfg-tauri-baseline
  - cfg-ferrum-nolifecycle
  - cfg-ferrum-adaptive
  - cfg-chrome-matched
  - cfg-edge-matched
metrics:
  - metric-tree-private-commit
  - metric-tree-private-working-set
  - metric-tree-working-set
  - metric-peak-tree-private-commit
  - metric-process-count
  - metric-tree-cpu-time
  - metric-tree-cpu-cycles
trials:
  target: 30
  warmup: 2
  order: randomized
analysis: "Per-trial time-averaged summaries; block-paired bootstrap (BCa, 9999 resamples, fixed seed) CI of median difference and ratio; sign-flip permutation test within blocks; Holm within the rq-01 family; Hedges' g and Cliff's delta; non-inferiority via one-sided CI bound for hyp-02."
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

# Baseline resource footprint

**Status:** `designed`. No runs have happened. **Runs in:** `phase-p6-benchmark-harness`.

| | |
|---|---|
| Hypotheses | [hyp-01](../hypotheses/hyp-01-idle-memory-vs-browsers.md), [hyp-02](../hypotheses/hyp-02-overhead-vs-tauri-baseline.md), [hyp-03](../hypotheses/hyp-03-background-cpu-without-lifecycle.md) |
| Workloads | [wl-static-info](../workloads/wl-static-info.md), [wl-spa-js-heavy](../workloads/wl-spa-js-heavy.md), [wl-large-dom](../workloads/wl-large-dom.md), [wl-multi-active](../workloads/wl-multi-active.md), [wl-many-background](../workloads/wl-many-background.md) |, [wl-public-supplementary](../workloads/wl-public-supplementary.md) (supplementary only, see below)
| Configurations | `cfg-chrome`, `cfg-edge`, `cfg-tauri-baseline`, `cfg-ferrum-nolifecycle`, `cfg-chrome-matched`, `cfg-edge-matched`; `cfg-ferrum-adaptive` only in the proposed P7 re-run campaign C2b (see below) (defined in [ov-research-configurations](../ov-research-configurations.md)) |
| Metrics | [metric-tree-private-commit](../metrics/metric-tree-private-commit.md), [metric-tree-private-working-set](../metrics/metric-tree-private-working-set.md), [metric-tree-working-set](../metrics/metric-tree-working-set.md), [metric-peak-tree-private-commit](../metrics/metric-peak-tree-private-commit.md), [metric-process-count](../metrics/metric-process-count.md), [metric-tree-cpu-time](../metrics/metric-tree-cpu-time.md), [metric-tree-cpu-cycles](../metrics/metric-tree-cpu-cycles.md) |
| Trials | target 30 per configuration x workload cell, 2 warm-up per cell, order `randomized` |

## Procedure

1. Run one block per repetition: every (configuration x workload) cell once, in a seeded random order. Use at least 30 blocks.
2. For each cell, create a fresh profile or user data folder, launch the product suspended into a new Job Object, resume it, load the workload, settle, then measure.
3. Discard the warm-up launches from the analysis but keep them in the raw data (flagged `warmup`).
4. Use the matched configurations (`cfg-chrome-matched`, `cfg-edge-matched`) only in a labelled secondary analysis. The headline comparison uses the as-shipped defaults ([ov-research-fairness-protocol](../ov-research-fairness-protocol.md)).
5. Take checkpoint readings in wl-multi-active at the after-tab-create and after-tab-close checkpoints (master prompt §7 memory list).

## Analysis

Per-trial time-averaged summaries; block-paired bootstrap (BCa, 9999 resamples, fixed seed) CI of median difference and ratio; sign-flip permutation test within blocks; Holm within the rq-01 family; Hedges' g and Cliff's delta; non-inferiority via one-sided CI bound for hyp-02.

The full rules are in [ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md): pre-registration, failed-run retention, percentile reporting and multiple comparisons.

## Supplementary public websites

[wl-public-supplementary](../workloads/wl-public-supplementary.md) also runs under this experiment as a **supplementary** workload. Its results are reported separately, are never pooled with the controlled local workloads, are not part of any hypothesis test or Holm family, and are only descriptive (master prompt §9). It runs only after the owner approves the site list (R-Q9).

## Campaign C2b: adaptive configuration (proposed, P7)

`cfg-ferrum-adaptive` (configuration E, master prompt §8) cannot run in campaign C1 because the adaptive policy does not exist until `phase-p7-lifecycle`. So that E is compared with A–D on this dimension, this experiment is re-run in P7 as **campaign C2b** (proposed): the full configuration set of this page, `cfg-ferrum-adaptive` included, in new randomised complete blocks with versions pinned for that campaign. C2b blocks are analysed on their own and are never pooled with C1 blocks, because versions and machine state may differ between campaigns. The comparisons of interest are E vs A, B, C and D, to check whether adaptive lifecycle management costs responsiveness, reliability or energy relative to the browsers. The coverage matrix and the open owner question (R-Q15 = Q-208) are in [ov-research-configurations](../ov-research-configurations.md#coverage-matrix-a-to-e). The P7 phase task for C2b is p7.14 in [phase-p7-lifecycle](../../phases/phase-p7-lifecycle.md), conditional on the owner's answer to Q-208.

## Fairness controls

Every trial follows [ov-research-fairness-protocol](../ov-research-fairness-protocol.md): the per-trial environment record, version pinning, the same CDP path for every product, window state, and job-object attribution.

## Outputs (all TBD)

- Raw data: `wiki/raw/bench/<run-id>/` (TBD; no runs yet).
- Analysis script: `analysis/scripts/baseline-footprint.py` (TBD).
- Figures: `analysis/figures/baseline-footprint-*.pdf` (TBD).
- `results_ref` stays absent until the status reaches `complete`.
