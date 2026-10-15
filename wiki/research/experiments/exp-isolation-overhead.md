---
id: exp-isolation-overhead
type: experiment
title: "Isolation-model overhead and shared resources"
status: designed
updated: 2026-10-15
sources:
  - raw/evidence/phase-p4-security/isolation-modes.md
  - raw/00-master-prompt.md
  - raw/research/measurement-methodology.md
  - raw/research/related-work-seed.md
  - raw/research/tauri-webview2-capabilities.md
related:
  - hyp-13
  - ov-research-configurations
  - ov-research-fairness-protocol
  - comp-benchmark-harness
  - comp-research-analysis
  - phase-p6-benchmark-harness
approvable: true
hypotheses:
  - hyp-13
workloads:
  - wl-multi-active
  - wl-static-info
configurations:
  - cfg-ferrum-shared-profile
  - cfg-ferrum-profile-per-site
  - cfg-ferrum-udf-per-site
metrics:
  - metric-tree-private-commit
  - metric-process-count
  - metric-nav-latency
trials:
  target: 30
  warmup: 2
  order: randomized
analysis: "Marginal memory per additional site estimated by per-trial linear fit over distinct_sites in {1,2,4,8}; bootstrap CI of difference in slopes; plus a qualitative shared-resource inventory table."
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

# Isolation-model overhead and shared resources

**Status:** `designed`. No runs have happened. **Runs in:** `phase-p6-benchmark-harness`.

| | |
|---|---|
| Hypotheses | [hyp-13](../hypotheses/hyp-13-profiles-cheaper-than-udfs.md) |
| Workloads | [wl-multi-active](../workloads/wl-multi-active.md), [wl-static-info](../workloads/wl-static-info.md) |
| Configurations | `cfg-ferrum-shared-profile`, `cfg-ferrum-profile-per-site`, `cfg-ferrum-udf-per-site` (defined in [ov-research-configurations](../ov-research-configurations.md); the three isolation modes are provided by [phase-p4-security](../../phases/phase-p4-security.md) task p4.15) |
| Metrics | [metric-tree-private-commit](../metrics/metric-tree-private-commit.md), [metric-process-count](../metrics/metric-process-count.md), [metric-nav-latency](../metrics/metric-nav-latency.md) |
| Trials | target 30 per configuration x workload cell, 2 warm-up per cell, order `randomized` |

## Procedure

1. Vary `distinct_sites` over {1, 2, 4, 8} (proposed) in wl-multi-active.
2. Produce the **shared-resource inventory** that master prompt §5 Phase 3 asks for. For each configuration, list which processes, caches, cookies and storage areas are shared, each backed by an observation or a document citation. Never claim complete isolation without validating it.
3. `cfg-ferrum-profile-per-site` depends on `risk-r01` and `adr-0010`. If it cannot be built, the experiment runs with the other two configurations and `hyp-13` is withdrawn.

## What P4 built for it (p4.12 review)

- All three configurations exist (p4.15): `[isolation] mode` = `shared`, `per-site` or `per-site-udf`, chosen at start;
  `cfg-ferrum-profile-per-site` could be built, so step 3 does not apply.
- The process inventory: Ferrum's test command `test_processes` (debug and test builds) lists every WebView2 process
  with its kind, frames and environment; the live spec `isolation-modes` records it per mode
  ([isolation-modes](../../raw/evidence/phase-p4-security/isolation-modes.md)). P6 takes process counts and memory from
  the harness's own process-tree sampling, not from this test command.
- The shared-resource inventory of step 2 starts from the p4.7 and p4.15 observations
  ([check-p4.7](../../raw/evidence/phase-p4-security/check-p4.7.txt),
  [isolation-modes](../../raw/evidence/phase-p4-security/isolation-modes.md)); the P4 exit gate collects them in
  `shared-resources.md`; P6 repeats the inventory per configuration.
- No microbenchmark: the cost of a mode is a whole-browser cost (processes, memory), measured only in P6.

## Analysis

Marginal memory per additional site estimated by per-trial linear fit over distinct_sites in {1,2,4,8}; bootstrap CI of difference in slopes; plus a qualitative shared-resource inventory table.

The full rules are in [ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md): pre-registration, failed-run retention, percentile reporting and multiple comparisons.

## Fairness controls

Every trial follows [ov-research-fairness-protocol](../ov-research-fairness-protocol.md): the per-trial environment record, version pinning, the same CDP path for every product, window state, and job-object attribution.

## Outputs (all TBD)

- Raw data: `wiki/raw/bench/<run-id>/` (TBD; no runs yet).
- Analysis script: `analysis/scripts/isolation-overhead.py` (TBD).
- Figures: `analysis/figures/isolation-overhead-*.pdf` (TBD).
- `results_ref` stays absent until the status reaches `complete`.
