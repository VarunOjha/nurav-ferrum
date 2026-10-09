---
id: exp-reliability
type: experiment
title: "Reliability, soak and recovery"
status: designed
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/research/measurement-methodology.md
  - raw/research/related-work-seed.md
  - raw/research/tauri-webview2-capabilities.md
related:
  - hyp-14
  - hyp-15
  - ov-research-configurations
  - ov-research-fairness-protocol
  - comp-benchmark-harness
  - comp-research-analysis
  - phase-p6-benchmark-harness
  - phase-p7-lifecycle
approvable: true
hypotheses:
  - hyp-14
  - hyp-15
workloads:
  - wl-frequent-nav
  - wl-session-churn
configurations:
  - cfg-chrome
  - cfg-edge
  - cfg-tauri-baseline
  - cfg-ferrum-nolifecycle
  - cfg-ferrum-adaptive
metrics:
  - metric-memory-growth-slope
  - metric-crash-count
  - metric-recovery-time
  - metric-restore-success-rate
  - metric-nav-failure-rate
trials:
  target: 10
  warmup: 0
  order: counterbalanced
analysis: "Theil-Sen slope per soak trial, bootstrap CI of slope difference (non-inferiority); exact binomial CIs for restore success; Poisson intervals for crash rates; network-interruption behaviour reported descriptively."
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
unverified:
  - claim: "A method exists to induce a renderer crash in each product"
    verify_in: phase-p6-benchmark-harness
---

# Reliability, soak and recovery

**Status:** `designed`. No runs have happened. **Runs in:** `phase-p6-benchmark-harness`.

| | |
|---|---|
| Hypotheses | [hyp-14](../hypotheses/hyp-14-memory-growth-non-inferior.md), [hyp-15](../hypotheses/hyp-15-restore-and-recovery.md) |
| Workloads | [wl-frequent-nav](../workloads/wl-frequent-nav.md), [wl-session-churn](../workloads/wl-session-churn.md) |
| Configurations | `cfg-chrome`, `cfg-edge`, `cfg-tauri-baseline`, `cfg-ferrum-nolifecycle`; `cfg-ferrum-adaptive` only in the proposed P7 re-run campaign C2b (see below) (defined in [ov-research-configurations](../ov-research-configurations.md)) |
| Metrics | [metric-memory-growth-slope](../metrics/metric-memory-growth-slope.md), [metric-crash-count](../metrics/metric-crash-count.md), [metric-recovery-time](../metrics/metric-recovery-time.md), [metric-restore-success-rate](../metrics/metric-restore-success-rate.md), [metric-nav-failure-rate](../metrics/metric-nav-failure-rate.md) |
| Trials | target 10 per configuration x workload cell, 0 warm-up per cell, order `counterbalanced` |

## Procedure

1. Each soak run takes about 2 hours (proposed), so the trial target is **10 per configuration**. This is a documented "where practical" exception to the master prompt's target of 30. Order is counterbalanced across days.
2. Inject faults only in harmless fixtures: induced renderer crash (method UNVERIFIED[phase-p6-benchmark-harness]), and a network interruption simulated by stopping the local fixture server. The system network is never changed.
3. Session restore (wl-session-churn) uses Ferrum configurations. Chrome and Edge restore is measured only if it can be scripted identically.

## Analysis

Theil-Sen slope per soak trial, bootstrap CI of slope difference (non-inferiority); exact binomial CIs for restore success; Poisson intervals for crash rates; network-interruption behaviour reported descriptively.

The full rules are in [ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md): pre-registration, failed-run retention, percentile reporting and multiple comparisons.

## Campaign C2b: adaptive configuration (proposed, P7)

`cfg-ferrum-adaptive` (configuration E, master prompt §8) cannot run in campaign C1 because the adaptive policy does not exist until `phase-p7-lifecycle`. So that E is compared with A–D on this dimension, this experiment is re-run in P7 as **campaign C2b** (proposed): the full configuration set of this page, `cfg-ferrum-adaptive` included, in new randomised complete blocks with versions pinned for that campaign. C2b blocks are analysed on their own and are never pooled with C1 blocks, because versions and machine state may differ between campaigns. The comparisons of interest are E vs A, B, C and D, to check whether adaptive lifecycle management costs responsiveness, reliability or energy relative to the browsers. The coverage matrix and the open owner question (R-Q15 = Q-208) are in [ov-research-configurations](../ov-research-configurations.md#coverage-matrix-a-to-e). The P7 phase task for C2b is p7.14 in [phase-p7-lifecycle](../../phases/phase-p7-lifecycle.md), conditional on the owner's answer to Q-208.

## Fairness controls

Every trial follows [ov-research-fairness-protocol](../ov-research-fairness-protocol.md): the per-trial environment record, version pinning, the same CDP path for every product, window state, and job-object attribution.

## Outputs (all TBD)

- Raw data: `wiki/raw/bench/<run-id>/` (TBD; no runs yet).
- Analysis script: `analysis/scripts/reliability.py` (TBD).
- Figures: `analysis/figures/reliability-*.pdf` (TBD).
- `results_ref` stays absent until the status reaches `complete`.
