---
id: exp-security-overhead
type: experiment
title: "Security-control overhead"
status: designed
updated: 2026-10-14
sources:
  - raw/00-master-prompt.md
  - raw/research/measurement-methodology.md
  - raw/research/related-work-seed.md
  - raw/research/tauri-webview2-capabilities.md
related:
  - hyp-12
  - ov-research-configurations
  - ov-research-fairness-protocol
  - comp-benchmark-harness
  - comp-research-analysis
  - phase-p6-benchmark-harness
approvable: true
hypotheses:
  - hyp-12
workloads:
  - wl-security-nav-mix
  - wl-frequent-nav
  - wl-static-info
configurations:
  - cfg-ferrum-nolifecycle
  - cfg-ferrum-nosecurity-bench
metrics:
  - metric-policy-eval-latency
  - metric-nav-latency
  - metric-tree-private-commit
trials:
  target: 30
  warmup: 2
  order: randomized
analysis: "Policy evaluation latency median/p95/p99 pooled within trial then summarised across trials; navigation latency and memory: block-paired bootstrap CI of ratio, non-inferiority bound; separate from security correctness tests."
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

# Security-control overhead

**Status:** `designed`. No runs have happened. **Runs in:** `phase-p6-benchmark-harness`.

| | |
|---|---|
| Hypotheses | [hyp-12](../hypotheses/hyp-12-security-overhead-small.md) |
| Workloads | [wl-security-nav-mix](../workloads/wl-security-nav-mix.md), [wl-frequent-nav](../workloads/wl-frequent-nav.md), [wl-static-info](../workloads/wl-static-info.md) |
| Configurations | `cfg-ferrum-nolifecycle`, `cfg-ferrum-nosecurity-bench` (defined in [ov-research-configurations](../ov-research-configurations.md); `cfg-ferrum-nosecurity-bench` is provided by [phase-p4-security](../../phases/phase-p4-security.md) task p4.16) |
| Metrics | [metric-policy-eval-latency](../metrics/metric-policy-eval-latency.md), [metric-nav-latency](../metrics/metric-nav-latency.md), [metric-tree-private-commit](../metrics/metric-tree-private-commit.md) |
| Trials | target 30 per configuration x workload cell, 2 warm-up per cell, order `randomized` |

## Procedure

1. `cfg-ferrum-nosecurity-bench` is a benchmark-only build (Cargo feature `bench-nosecurity`, built in p4.16) in which the navigation policy lets every web address load without its rules. Ferrum's own origin (`tauri:`, `http(s)://tauri.localhost`), the forbidden schemes (local files, `javascript:`, browser pages) and links to other apps (still confirmed or refused) keep their rules, and permission refusals and download cleaning are unchanged, so the ablation measures the cost of the web rules, not of those protections. It starts only with `--benchmark-mode` and its own data folder, is never shipped (proven per release by `scripts/security-static-check.ps1`, [nosecurity-absent](../../raw/evidence/phase-p4-security/nosecurity-absent.txt)) and is never used with public sites ([ov-research-configurations](../ov-research-configurations.md)). It is a second binary: the comparison carries a build confound, stated with the results.
2. Compare only allowed navigations for latency. Blocked navigations have no counterpart in the ablation.
3. Report the span instrumentation overhead next to the results.

## Analysis

Policy evaluation latency median/p95/p99 pooled within trial then summarised across trials; navigation latency and memory: block-paired bootstrap CI of ratio, non-inferiority bound; separate from security correctness tests.

The full rules are in [ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md): pre-registration, failed-run retention, percentile reporting and multiple comparisons.

## Fairness controls

Every trial follows [ov-research-fairness-protocol](../ov-research-fairness-protocol.md): the per-trial environment record, version pinning, the same CDP path for every product, window state, and job-object attribution.

## Outputs (all TBD)

- Raw data: `wiki/raw/bench/<run-id>/` (TBD; no runs yet).
- Analysis script: `analysis/scripts/security-overhead.py` (TBD).
- Figures: `analysis/figures/security-overhead-*.pdf` (TBD).
- `results_ref` stays absent until the status reaches `complete`.
