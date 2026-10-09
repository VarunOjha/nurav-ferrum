---
id: exp-energy
type: experiment
title: "Energy per completed workload"
status: designed
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/research/measurement-methodology.md
  - raw/research/related-work-seed.md
  - raw/research/tauri-webview2-capabilities.md
related:
  - hyp-07
  - ov-research-configurations
  - ov-research-fairness-protocol
  - comp-benchmark-harness
  - comp-research-analysis
  - phase-p6-benchmark-harness
  - phase-p7-lifecycle
approvable: true
hypotheses:
  - hyp-07
workloads:
  - wl-static-info
  - wl-video-playback
  - wl-spa-js-heavy
  - wl-many-background
configurations:
  - cfg-chrome
  - cfg-edge
  - cfg-tauri-baseline
  - cfg-ferrum-nolifecycle
  - cfg-ferrum-adaptive
metrics:
  - metric-cpu-package-energy
  - metric-wall-energy
  - metric-tree-cpu-time
trials:
  target: 30
  warmup: 2
  order: randomized
analysis: "Energy above same-session idle baseline per completed workload; block-paired bootstrap CI of ratio; Holm within rq-03 family; executed only for energy metrics that passed the validation gate, otherwise reported as unsupported."
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

# Energy per completed workload

**Status:** `designed`. No runs have happened. **Runs in:** `phase-p6-benchmark-harness`.

| | |
|---|---|
| Hypotheses | [hyp-07](../hypotheses/hyp-07-energy-per-workload.md) |
| Workloads | [wl-static-info](../workloads/wl-static-info.md), [wl-video-playback](../workloads/wl-video-playback.md), [wl-spa-js-heavy](../workloads/wl-spa-js-heavy.md), [wl-many-background](../workloads/wl-many-background.md) |
| Configurations | `cfg-chrome`, `cfg-edge`, `cfg-tauri-baseline`, `cfg-ferrum-nolifecycle`; `cfg-ferrum-adaptive` only in the proposed P7 re-run campaign C2b (see below) (defined in [ov-research-configurations](../ov-research-configurations.md)) |
| Metrics | [metric-cpu-package-energy](../metrics/metric-cpu-package-energy.md), [metric-wall-energy](../metrics/metric-wall-energy.md), [metric-tree-cpu-time](../metrics/metric-tree-cpu-time.md) |
| Trials | target 30 per configuration x workload cell, 2 warm-up per cell, order `randomized` |

## Procedure

1. **Validation gate first** (see [metric-cpu-package-energy](../metrics/metric-cpu-package-energy.md)): check that the counter is readable, that its unit and wrap period are known, that an A/A noise floor exists, that load steps give monotonic readings, and that it correlates with the wall meter if there is one.
2. If the gate fails, set the metric to `unsupported`, log it in [ov-research-experiment-log](../ov-research-experiment-log.md), set `hyp-07` to `withdrawn`, and **do not estimate**.
3. Measure an idle baseline at the start and end of every session. Abort the session if the baseline drifts beyond the pre-registered tolerance.
4. Never use WinRing0. Use PawnIO only after the owner approves it (`adr-0009`).

## Analysis

Energy above same-session idle baseline per completed workload; block-paired bootstrap CI of ratio; Holm within rq-03 family; executed only for energy metrics that passed the validation gate, otherwise reported as unsupported.

The full rules are in [ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md): pre-registration, failed-run retention, percentile reporting and multiple comparisons.

## Campaign C2b: adaptive configuration (proposed, P7)

`cfg-ferrum-adaptive` (configuration E, master prompt §8) cannot run in campaign C1 because the adaptive policy does not exist until `phase-p7-lifecycle`. So that E is compared with A–D on this dimension, this experiment is re-run in P7 as **campaign C2b** (proposed): the full configuration set of this page, `cfg-ferrum-adaptive` included, in new randomised complete blocks with versions pinned for that campaign. C2b blocks are analysed on their own and are never pooled with C1 blocks, because versions and machine state may differ between campaigns. The comparisons of interest are E vs A, B, C and D, to check whether adaptive lifecycle management costs responsiveness, reliability or energy relative to the browsers. The coverage matrix and the open owner question (R-Q15 = Q-208) are in [ov-research-configurations](../ov-research-configurations.md#coverage-matrix-a-to-e). The P7 phase task for C2b is p7.14 in [phase-p7-lifecycle](../../phases/phase-p7-lifecycle.md), conditional on the owner's answer to Q-208.

## Fairness controls

Every trial follows [ov-research-fairness-protocol](../ov-research-fairness-protocol.md): the per-trial environment record, version pinning, the same CDP path for every product, window state, and job-object attribution.

## Outputs (all TBD)

- Raw data: `wiki/raw/bench/<run-id>/` (TBD; no runs yet).
- Analysis script: `analysis/scripts/energy.py` (TBD).
- Figures: `analysis/figures/energy-*.pdf` (TBD).
- `results_ref` stays absent until the status reaches `complete`.
