---
id: exp-navigation
type: experiment
title: "Navigation latency"
status: designed
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/research/measurement-methodology.md
  - raw/research/related-work-seed.md
  - raw/research/tauri-webview2-capabilities.md
related:
  - hyp-05
  - ov-research-configurations
  - ov-research-fairness-protocol
  - comp-benchmark-harness
  - comp-research-analysis
  - phase-p6-benchmark-harness
  - phase-p7-lifecycle
approvable: true
hypotheses:
  - hyp-05
workloads:
  - wl-frequent-nav
  - wl-static-info
  - wl-large-dom
  - wl-public-supplementary
configurations:
  - cfg-chrome
  - cfg-edge
  - cfg-tauri-baseline
  - cfg-ferrum-nolifecycle
  - cfg-ferrum-adaptive
metrics:
  - metric-nav-latency
  - metric-nav-failure-rate
  - metric-tree-cpu-time
trials:
  target: 30
  warmup: 2
  order: randomized
analysis: "Per trial and scenario: median (and p95/p99 when the per-trial count permits) of navigation latency; across trials block-paired bootstrap CI of median ratio; non-inferiority by one-sided 95% bound; Holm within rq-02 family."
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

# Navigation latency

**Status:** `designed`. No runs have happened. **Runs in:** `phase-p6-benchmark-harness`.

| | |
|---|---|
| Hypotheses | [hyp-05](../hypotheses/hyp-05-navigation-non-inferiority.md) |
| Workloads | [wl-frequent-nav](../workloads/wl-frequent-nav.md), [wl-static-info](../workloads/wl-static-info.md), [wl-large-dom](../workloads/wl-large-dom.md) |, [wl-public-supplementary](../workloads/wl-public-supplementary.md) (supplementary only, see below)
| Configurations | `cfg-chrome`, `cfg-edge`, `cfg-tauri-baseline`, `cfg-ferrum-nolifecycle`; `cfg-ferrum-adaptive` only in the proposed P7 re-run campaign C2b (see below) (defined in [ov-research-configurations](../ov-research-configurations.md)) |
| Metrics | [metric-nav-latency](../metrics/metric-nav-latency.md), [metric-nav-failure-rate](../metrics/metric-nav-failure-rate.md), [metric-tree-cpu-time](../metrics/metric-tree-cpu-time.md) |
| Trials | target 30 per configuration x workload cell, 2 warm-up per cell, order `randomized` |

## Procedure

1. Trigger navigations the same way in every product, through the common CDP connection (in-page link activation).
2. Analyse each scenario separately: same-origin, cross-origin, cross-site, redirect chains, back/forward, cached and uncached.
3. Keep failed navigations and report them as [metric-nav-failure-rate](../metrics/metric-nav-failure-rate.md).

## Analysis

Per trial and scenario: median (and p95/p99 when the per-trial count permits) of navigation latency; across trials block-paired bootstrap CI of median ratio; non-inferiority by one-sided 95% bound; Holm within rq-02 family.

The full rules are in [ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md): pre-registration, failed-run retention, percentile reporting and multiple comparisons.

## Supplementary public websites

[wl-public-supplementary](../workloads/wl-public-supplementary.md) also runs under this experiment as a **supplementary** workload. Its results are reported separately, are never pooled with the controlled local workloads, are not part of any hypothesis test or Holm family, and are only descriptive (master prompt §9). It runs only after the owner approves the site list (R-Q9).

## Campaign C2b: adaptive configuration (proposed, P7)

`cfg-ferrum-adaptive` (configuration E, master prompt §8) cannot run in campaign C1 because the adaptive policy does not exist until `phase-p7-lifecycle`. So that E is compared with A–D on this dimension, this experiment is re-run in P7 as **campaign C2b** (proposed): the full configuration set of this page, `cfg-ferrum-adaptive` included, in new randomised complete blocks with versions pinned for that campaign. C2b blocks are analysed on their own and are never pooled with C1 blocks, because versions and machine state may differ between campaigns. The comparisons of interest are E vs A, B, C and D, to check whether adaptive lifecycle management costs responsiveness, reliability or energy relative to the browsers. The coverage matrix and the open owner question (R-Q15 = Q-208) are in [ov-research-configurations](../ov-research-configurations.md#coverage-matrix-a-to-e). The P7 phase task for C2b is p7.14 in [phase-p7-lifecycle](../../phases/phase-p7-lifecycle.md), conditional on the owner's answer to Q-208.

## Fairness controls

Every trial follows [ov-research-fairness-protocol](../ov-research-fairness-protocol.md): the per-trial environment record, version pinning, the same CDP path for every product, window state, and job-object attribution.

## Outputs (all TBD)

- Raw data: `wiki/raw/bench/<run-id>/` (TBD; no runs yet).
- Analysis script: `analysis/scripts/navigation.py` (TBD).
- Figures: `analysis/figures/navigation-*.pdf` (TBD).
- `results_ref` stays absent until the status reaches `complete`.
