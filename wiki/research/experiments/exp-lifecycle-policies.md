---
id: exp-lifecycle-policies
type: experiment
title: "Lifecycle policy comparison"
status: designed
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/research/measurement-methodology.md
  - raw/research/related-work-seed.md
  - raw/research/tauri-webview2-capabilities.md
related:
  - hyp-08
  - hyp-09
  - hyp-10
  - hyp-11
  - ov-research-configurations
  - ov-research-fairness-protocol
  - comp-benchmark-harness
  - comp-research-analysis
  - phase-p7-lifecycle
approvable: true
hypotheses:
  - hyp-08
  - hyp-09
  - hyp-10
  - hyp-11
workloads:
  - wl-many-background
  - wl-session-churn
  - wl-multi-active
  - wl-video-playback
configurations:
  - cfg-ferrum-nolifecycle
  - cfg-ferrum-fixed-idle
  - cfg-ferrum-mempressure
  - cfg-ferrum-adaptive
  - cfg-chrome
  - cfg-edge
metrics:
  - metric-tree-private-commit
  - metric-cpu-package-energy
  - metric-wall-energy
  - metric-restore-latency
  - metric-objective-j
  - metric-safety-violations
  - metric-lifecycle-transitions
  - metric-tree-cpu-time
trials:
  target: 30
  warmup: 2
  order: randomized
analysis: "Primary: median J per configuration under pre-registered weights, block-paired bootstrap BCa CI of pairwise J differences, Holm within rq-04 family; secondary: weight-simplex sensitivity (share of grid where each policy is best), component metrics M, E, L separately; safety: exact binomial upper bound."
phase: phase-p7-lifecycle
fairness_controls:
  - "as-shipped defaults headline; matched configs labelled secondary"
  - "fresh profile per launch; Job Object attribution"
  - "identical viewport, window state, display mode, network (loopback fixtures), cache policy, no extensions, no logins"
  - "versions and resource-saving policies recorded per trial"
  - "same CDP connection path for all products"
tags:
  - research
  - experiment
unverified:
  - claim: "Whether this triggers Windows low-memory signalling"
    verify_in: phase-p7-lifecycle
---

# Lifecycle policy comparison

**Status:** `designed`. No runs have happened. **Runs in:** `phase-p7-lifecycle`.

| | |
|---|---|
| Hypotheses | [hyp-08](../hypotheses/hyp-08-adaptive-reduces-memory.md), [hyp-09](../hypotheses/hyp-09-adaptive-lowest-objective.md), [hyp-10](../hypotheses/hyp-10-adaptive-restore-latency.md), [hyp-11](../hypotheses/hyp-11-lifecycle-safety.md) |
| Workloads | [wl-many-background](../workloads/wl-many-background.md), [wl-session-churn](../workloads/wl-session-churn.md), [wl-multi-active](../workloads/wl-multi-active.md), [wl-video-playback](../workloads/wl-video-playback.md) |
| Configurations | `cfg-ferrum-nolifecycle`, `cfg-ferrum-fixed-idle`, `cfg-ferrum-mempressure`, `cfg-ferrum-adaptive`, `cfg-chrome`, `cfg-edge` (defined in [ov-research-configurations](../ov-research-configurations.md)) |
| Metrics | [metric-tree-private-commit](../metrics/metric-tree-private-commit.md), [metric-cpu-package-energy](../metrics/metric-cpu-package-energy.md), [metric-wall-energy](../metrics/metric-wall-energy.md), [metric-restore-latency](../metrics/metric-restore-latency.md), [metric-objective-j](../metrics/metric-objective-j.md), [metric-safety-violations](../metrics/metric-safety-violations.md), [metric-lifecycle-transitions](../metrics/metric-lifecycle-transitions.md), [metric-tree-cpu-time](../metrics/metric-tree-cpu-time.md) |
| Trials | target 30 per configuration x workload cell, 2 warm-up per cell, order `randomized` |

## Procedure

1. The four master-prompt §6 strategies map to `cfg-ferrum-nolifecycle`, `cfg-ferrum-fixed-idle`, `cfg-ferrum-mempressure` and `cfg-ferrum-adaptive` ([ov-research-configurations](../ov-research-configurations.md)).
2. `cfg-chrome` and `cfg-edge` (as shipped, with their own tab lifecycle features) are **external reference points**. They are reported on M and L only and are not part of the J comparison, because the J normalisation reference is a Ferrum configuration.
3. **Train/test separation:** adaptive-policy parameters are tuned only on development activation-trace seeds. Confirmatory trials use fresh seeds that are fixed at pre-registration.
4. Memory-pressure condition: a harness-controlled process commits and touches memory to a pre-registered level. Whether this triggers Windows low-memory signalling is UNVERIFIED[phase-p7-lifecycle].
5. Run the safety fixtures (paused media, active download, unsaved form, user exclusion) inside wl-many-background in every trial.

## Analysis

Primary: median J per configuration under pre-registered weights, block-paired bootstrap BCa CI of pairwise J differences, Holm within rq-04 family; secondary: weight-simplex sensitivity (share of grid where each policy is best), component metrics M, E, L separately; safety: exact binomial upper bound.

The full rules are in [ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md): pre-registration, failed-run retention, percentile reporting and multiple comparisons.

## Fairness controls

Every trial follows [ov-research-fairness-protocol](../ov-research-fairness-protocol.md): the per-trial environment record, version pinning, the same CDP path for every product, window state, and job-object attribution.

## Outputs (all TBD)

- Raw data: `wiki/raw/bench/<run-id>/` (TBD; no runs yet).
- Analysis script: `analysis/scripts/lifecycle-policies.py` (TBD).
- Figures: `analysis/figures/lifecycle-policies-*.pdf` (TBD).
- `results_ref` stays absent until the status reaches `complete`.
