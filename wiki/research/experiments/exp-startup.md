---
id: exp-startup
type: experiment
title: "Startup latency"
status: designed
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/research/measurement-methodology.md
  - raw/research/related-work-seed.md
  - raw/research/tauri-webview2-capabilities.md
related:
  - hyp-04
  - ov-research-configurations
  - ov-research-fairness-protocol
  - comp-benchmark-harness
  - comp-research-analysis
  - phase-p6-benchmark-harness
approvable: true
hypotheses:
  - hyp-04
workloads:
  - wl-static-info
configurations:
  - cfg-chrome
  - cfg-edge
  - cfg-tauri-baseline
  - cfg-ferrum-nolifecycle
metrics:
  - metric-startup-window-visible
  - metric-startup-fcp
  - metric-startup-lcp
  - metric-tree-private-commit
trials:
  target: 30
  warmup: 3
  order: randomized
analysis: "Per-launch values; medians with block-paired bootstrap BCa CI; Holm within rq-02 family; fresh-profile and warm-start conditions analysed separately (never pooled)."
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

# Startup latency

**Status:** `designed`. No runs have happened. **Runs in:** `phase-p6-benchmark-harness`.

| | |
|---|---|
| Hypotheses | [hyp-04](../hypotheses/hyp-04-startup-window-visible.md) |
| Workloads | [wl-static-info](../workloads/wl-static-info.md) |
| Configurations | `cfg-chrome`, `cfg-edge`, `cfg-tauri-baseline`, `cfg-ferrum-nolifecycle` (defined in [ov-research-configurations](../ov-research-configurations.md)) |
| Metrics | [metric-startup-window-visible](../metrics/metric-startup-window-visible.md), [metric-startup-fcp](../metrics/metric-startup-fcp.md), [metric-startup-lcp](../metrics/metric-startup-lcp.md), [metric-tree-private-commit](../metrics/metric-tree-private-commit.md) |
| Trials | target 30 per configuration x workload cell, 3 warm-up per cell, order `randomized` |

## Procedure

1. Use two conditions. **Fresh-profile start** gets a new profile for each launch. **Warm start** is a second launch on the same profile right after a clean exit.
2. Disable Edge Startup Boost by policy, and check that no `msedge.exe` is running before T0.
3. Run a true cold start (file cache flushed) only if a flush method is validated in P6. Otherwise do not claim it.
4. Run a cool-down between launches until CPU temperature and idle power are back within the session-baseline tolerance ([ov-research-fairness-protocol](../ov-research-fairness-protocol.md)).

## Analysis

Per-launch values; medians with block-paired bootstrap BCa CI; Holm within rq-02 family; fresh-profile and warm-start conditions analysed separately (never pooled).

The full rules are in [ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md): pre-registration, failed-run retention, percentile reporting and multiple comparisons.

## Fairness controls

Every trial follows [ov-research-fairness-protocol](../ov-research-fairness-protocol.md): the per-trial environment record, version pinning, the same CDP path for every product, window state, and job-object attribution.

## Outputs (all TBD)

- Raw data: `wiki/raw/bench/<run-id>/` (TBD; no runs yet).
- Analysis script: `analysis/scripts/startup.py` (TBD).
- Figures: `analysis/figures/startup-*.pdf` (TBD).
- `results_ref` stays absent until the status reaches `complete`.
