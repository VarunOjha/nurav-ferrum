---
id: ov-research-traceability
type: overview
title: "Traceability matrix (RQ to conclusion)"
status: draft
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
related:
  - ov-research-plan
  - ov-research-paper-plan
  - comp-research-analysis
  - rq-01
  - rq-02
  - rq-03
  - rq-04
  - rq-05
  - rq-06
  - rq-07
approvable: true
phase: phase-p8-research-paper
tags:
  - research
  - traceability
---

# Traceability matrix

Master prompt §13 requires a traceable chain from research questions through hypotheses, experiments, raw data, statistical analyses and figures to conclusions ([master prompt](../raw/00-master-prompt.md)). Future paths are **TBD**. Nothing here is a result.

```mermaid
flowchart LR
    rq["Research question (rq-*)"] --> hyp["Hypothesis (hyp-*)"]
    hyp --> exp["Experiment (exp-*)"]
    exp --> metric["Metric (metric-*) + workload (wl-*)"]
    metric --> raw["raw/bench/run-id (immutable)"]
    raw --> script["analysis/scripts/*.py (hash recorded)"]
    script --> fig["analysis/figures + paper tables"]
    fig --> concl["Conclusion on rq page + paper"]
```

## RQ → hypothesis → experiment → metric → data → script → figure → conclusion

| RQ | Hypothesis | Experiment | Metrics | Raw data | Analysis script | Figure | Conclusion |
|---|---|---|---|---|---|---|---|
| [rq-01](questions/rq-01-resource-footprint.md) | [hyp-01](hypotheses/hyp-01-idle-memory-vs-browsers.md) | [exp-baseline-footprint](experiments/exp-baseline-footprint.md) | [metric-tree-private-commit](metrics/metric-tree-private-commit.md), [metric-tree-private-working-set](metrics/metric-tree-private-working-set.md), [metric-process-count](metrics/metric-process-count.md) | TBD `raw/bench/<run-id>/` | TBD `analysis/scripts/baseline-footprint.py` | TBD | none (no data) |
| [rq-01](questions/rq-01-resource-footprint.md) | [hyp-02](hypotheses/hyp-02-overhead-vs-tauri-baseline.md) | [exp-baseline-footprint](experiments/exp-baseline-footprint.md) | [metric-tree-private-commit](metrics/metric-tree-private-commit.md), [metric-tree-cpu-time](metrics/metric-tree-cpu-time.md) | TBD `raw/bench/<run-id>/` | TBD `analysis/scripts/baseline-footprint.py` | TBD | none (no data) |
| [rq-01](questions/rq-01-resource-footprint.md) | [hyp-03](hypotheses/hyp-03-background-cpu-without-lifecycle.md) | [exp-baseline-footprint](experiments/exp-baseline-footprint.md) | [metric-tree-cpu-time](metrics/metric-tree-cpu-time.md), [metric-tree-cpu-cycles](metrics/metric-tree-cpu-cycles.md) | TBD `raw/bench/<run-id>/` | TBD `analysis/scripts/baseline-footprint.py` | TBD | none (no data) |
| [rq-02](questions/rq-02-responsiveness.md) | [hyp-04](hypotheses/hyp-04-startup-window-visible.md) | [exp-startup](experiments/exp-startup.md) | [metric-startup-window-visible](metrics/metric-startup-window-visible.md), [metric-startup-fcp](metrics/metric-startup-fcp.md), [metric-startup-lcp](metrics/metric-startup-lcp.md) | TBD `raw/bench/<run-id>/` | TBD `analysis/scripts/startup.py` | TBD | none (no data) |
| [rq-02](questions/rq-02-responsiveness.md) | [hyp-05](hypotheses/hyp-05-navigation-non-inferiority.md) | [exp-navigation](experiments/exp-navigation.md) | [metric-nav-latency](metrics/metric-nav-latency.md), [metric-nav-failure-rate](metrics/metric-nav-failure-rate.md) | TBD `raw/bench/<run-id>/` | TBD `analysis/scripts/navigation.py` | TBD | none (no data) |
| [rq-02](questions/rq-02-responsiveness.md) | [hyp-06](hypotheses/hyp-06-rendering-non-inferiority.md) | [exp-rendering](experiments/exp-rendering.md) | [metric-frame-interval](metrics/metric-frame-interval.md), [metric-frame-miss-rate](metrics/metric-frame-miss-rate.md), [metric-canvas-throughput](metrics/metric-canvas-throughput.md), [metric-loaf-blocking](metrics/metric-loaf-blocking.md) | TBD `raw/bench/<run-id>/` | TBD `analysis/scripts/rendering.py` | TBD | none (no data) |
| [rq-03](questions/rq-03-energy.md) | [hyp-07](hypotheses/hyp-07-energy-per-workload.md) | [exp-energy](experiments/exp-energy.md) | [metric-cpu-package-energy](metrics/metric-cpu-package-energy.md), [metric-wall-energy](metrics/metric-wall-energy.md), [metric-tree-cpu-time](metrics/metric-tree-cpu-time.md) | TBD `raw/bench/<run-id>/` | TBD `analysis/scripts/energy.py` | TBD | none (no data) |
| [rq-04](questions/rq-04-lifecycle-policies.md) | [hyp-08](hypotheses/hyp-08-adaptive-reduces-memory.md) | [exp-lifecycle-policies](experiments/exp-lifecycle-policies.md) | [metric-tree-private-commit](metrics/metric-tree-private-commit.md), [metric-lifecycle-transitions](metrics/metric-lifecycle-transitions.md) | TBD `raw/bench/<run-id>/` | TBD `analysis/scripts/lifecycle-policies.py` | TBD | none (no data) |
| [rq-04](questions/rq-04-lifecycle-policies.md) | [hyp-09](hypotheses/hyp-09-adaptive-lowest-objective.md) | [exp-lifecycle-policies](experiments/exp-lifecycle-policies.md) | [metric-objective-j](metrics/metric-objective-j.md), [metric-tree-private-commit](metrics/metric-tree-private-commit.md), [metric-restore-latency](metrics/metric-restore-latency.md), [metric-cpu-package-energy](metrics/metric-cpu-package-energy.md), [metric-wall-energy](metrics/metric-wall-energy.md) | TBD `raw/bench/<run-id>/` | TBD `analysis/scripts/lifecycle-policies.py` | TBD | none (no data) |
| [rq-04](questions/rq-04-lifecycle-policies.md) | [hyp-10](hypotheses/hyp-10-adaptive-restore-latency.md) | [exp-lifecycle-policies](experiments/exp-lifecycle-policies.md) | [metric-restore-latency](metrics/metric-restore-latency.md), [metric-lifecycle-transitions](metrics/metric-lifecycle-transitions.md) | TBD `raw/bench/<run-id>/` | TBD `analysis/scripts/lifecycle-policies.py` | TBD | none (no data) |
| [rq-04](questions/rq-04-lifecycle-policies.md) | [hyp-11](hypotheses/hyp-11-lifecycle-safety.md) | [exp-lifecycle-policies](experiments/exp-lifecycle-policies.md) | [metric-safety-violations](metrics/metric-safety-violations.md) | TBD `raw/bench/<run-id>/` | TBD `analysis/scripts/lifecycle-policies.py` | TBD | none (no data) |
| [rq-05](questions/rq-05-security-overhead.md) | [hyp-12](hypotheses/hyp-12-security-overhead-small.md) | [exp-security-overhead](experiments/exp-security-overhead.md) | [metric-policy-eval-latency](metrics/metric-policy-eval-latency.md), [metric-nav-latency](metrics/metric-nav-latency.md), [metric-tree-private-commit](metrics/metric-tree-private-commit.md) | TBD `raw/bench/<run-id>/` | TBD `analysis/scripts/security-overhead.py` | TBD | none (no data) |
| [rq-06](questions/rq-06-isolation.md) | [hyp-13](hypotheses/hyp-13-profiles-cheaper-than-udfs.md) | [exp-isolation-overhead](experiments/exp-isolation-overhead.md) | [metric-tree-private-commit](metrics/metric-tree-private-commit.md), [metric-process-count](metrics/metric-process-count.md) | TBD `raw/bench/<run-id>/` | TBD `analysis/scripts/isolation-overhead.py` | TBD | none (no data) |
| [rq-07](questions/rq-07-reliability.md) | [hyp-14](hypotheses/hyp-14-memory-growth-non-inferior.md) | [exp-reliability](experiments/exp-reliability.md) | [metric-memory-growth-slope](metrics/metric-memory-growth-slope.md), [metric-crash-count](metrics/metric-crash-count.md), [metric-nav-failure-rate](metrics/metric-nav-failure-rate.md) | TBD `raw/bench/<run-id>/` | TBD `analysis/scripts/reliability.py` | TBD | none (no data) |
| [rq-07](questions/rq-07-reliability.md) | [hyp-15](hypotheses/hyp-15-restore-and-recovery.md) | [exp-reliability](experiments/exp-reliability.md) | [metric-restore-success-rate](metrics/metric-restore-success-rate.md), [metric-recovery-time](metrics/metric-recovery-time.md), [metric-crash-count](metrics/metric-crash-count.md) | TBD `raw/bench/<run-id>/` | TBD `analysis/scripts/reliability.py` | TBD | none (no data) |

**Rows not tied to a hypothesis.** [wl-public-supplementary](workloads/wl-public-supplementary.md) runs under [exp-baseline-footprint](experiments/exp-baseline-footprint.md) and [exp-navigation](experiments/exp-navigation.md) as a descriptive, supplementary workload only; it feeds no hypothesis test and is reported separately. The proposed P7 campaign C2b (configuration E against A–D, owner question R-Q15, [ov-research-configurations](ov-research-configurations.md#coverage-matrix-a-to-e)) reuses the experiment rows above; its raw data gets its own run ids and is never pooled with C1.

## Metric support status

| Metric | Unit | Support | Validated in |
|---|---|---|---|
| [metric-tree-private-commit](metrics/metric-tree-private-commit.md) | bytes | `unverified` | `phase-p5-telemetry` |
| [metric-tree-private-working-set](metrics/metric-tree-private-working-set.md) | bytes | `unverified` | `phase-p5-telemetry` |
| [metric-tree-working-set](metrics/metric-tree-working-set.md) | bytes | `unverified` | `phase-p5-telemetry` |
| [metric-peak-tree-private-commit](metrics/metric-peak-tree-private-commit.md) | bytes | `unverified` | `phase-p5-telemetry` |
| [metric-process-count](metrics/metric-process-count.md) | count | `unverified` | `phase-p5-telemetry` |
| [metric-tree-cpu-time](metrics/metric-tree-cpu-time.md) | s | `unverified` | `phase-p5-telemetry` |
| [metric-tree-cpu-cycles](metrics/metric-tree-cpu-cycles.md) | cycles | `unverified` | `phase-p5-telemetry` |
| [metric-startup-window-visible](metrics/metric-startup-window-visible.md) | ms | `unverified` | `phase-p5-telemetry` |
| [metric-startup-fcp](metrics/metric-startup-fcp.md) | ms | `unverified` | `phase-p5-telemetry` |
| [metric-startup-lcp](metrics/metric-startup-lcp.md) | ms | `unverified` | `phase-p5-telemetry` |
| [metric-nav-latency](metrics/metric-nav-latency.md) | ms | `unverified` | `phase-p5-telemetry` |
| [metric-nav-failure-rate](metrics/metric-nav-failure-rate.md) | ratio | `unverified` | `phase-p5-telemetry` |
| [metric-frame-interval](metrics/metric-frame-interval.md) | ms | `unverified` | `phase-p6-benchmark-harness` |
| [metric-frame-miss-rate](metrics/metric-frame-miss-rate.md) | ratio | `unverified` | `phase-p6-benchmark-harness` |
| [metric-loaf-blocking](metrics/metric-loaf-blocking.md) | ms | `unverified` | `phase-p5-telemetry` |
| [metric-canvas-throughput](metrics/metric-canvas-throughput.md) | ops/s | `unverified` | `phase-p6-benchmark-harness` |
| [metric-cpu-package-energy](metrics/metric-cpu-package-energy.md) | J | `unverified` | `phase-p6-benchmark-harness` |
| [metric-wall-energy](metrics/metric-wall-energy.md) | J | `unverified` | `phase-p6-benchmark-harness` |
| [metric-restore-latency](metrics/metric-restore-latency.md) | ms | `unverified` | `phase-p7-lifecycle` |
| [metric-objective-j](metrics/metric-objective-j.md) | dimensionless | `unverified` | `phase-p7-lifecycle` |
| [metric-safety-violations](metrics/metric-safety-violations.md) | count | `unverified` | `phase-p7-lifecycle` |
| [metric-lifecycle-transitions](metrics/metric-lifecycle-transitions.md) | count | `unverified` | `phase-p7-lifecycle` |
| [metric-memory-growth-slope](metrics/metric-memory-growth-slope.md) | MiB/h | `unverified` | `phase-p6-benchmark-harness` |
| [metric-crash-count](metrics/metric-crash-count.md) | count | `unverified` | `phase-p6-benchmark-harness` |
| [metric-recovery-time](metrics/metric-recovery-time.md) | ms | `unverified` | `phase-p6-benchmark-harness` |
| [metric-restore-success-rate](metrics/metric-restore-success-rate.md) | ratio | `unverified` | `phase-p6-benchmark-harness` |
| [metric-policy-eval-latency](metrics/metric-policy-eval-latency.md) | us | `unverified` | `phase-p4-security` |

## Rules

1. When an experiment reaches `complete`, its `results_ref` lists the `raw/bench/<run-id>/` paths and the matching TBD cells here are filled in, in the same edit.
2. A conclusion cell may say something only when the hypothesis has a verdict status backed by an `analyzed` experiment (SCHEMA §6.7).
3. Every figure in the paper must appear in this table. Figures that are not listed here are not allowed.
4. The raw-data location is an open owner question (R-Q10, in [ov-research-plan](ov-research-plan.md)).
