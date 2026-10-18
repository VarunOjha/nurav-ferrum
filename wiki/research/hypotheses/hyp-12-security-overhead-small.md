---
id: hyp-12
type: hypothesis
title: "The security engine adds negligible navigation latency and memory"
status: draft
updated: 2026-10-18
sources:
  - raw/00-master-prompt.md
  - raw/research/measurement-methodology.md
  - raw/research/related-work-seed.md
related:
  - rq-05
  - exp-security-overhead
  - ov-research-statistical-analysis-plan
approvable: true
rq: rq-05
prediction: "The p95 policy evaluation latency is below 1 ms per decision. cfg-ferrum-nolifecycle's median navigation latency on wl-security-nav-mix (allowed navigations only) and its idle tree private commit are each no more than 5% above cfg-ferrum-nosecurity-bench's."
null_hypothesis: "The p95 evaluation latency is at least 1 ms, or either relative overhead is at least 5%."
metrics:
  - metric-policy-eval-latency
  - metric-nav-latency
  - metric-tree-private-commit
experiments:
  - exp-security-overhead
practical_threshold: "1 ms p95 per decision; 5% non-inferiority margins (proposed)."
phase: phase-p6-benchmark-harness
tags:
  - research
  - preregistration-candidate
unverified:
  - claim: "Evaluating a policy (URL parsing plus list lookups) should be cheap compared with a navigation. That expectation"
    verify_in: phase-p6-benchmark-harness
---

# HYP-12: The security engine adds negligible navigation latency and memory

Research question: [rq-05](../questions/rq-05-security-overhead.md). Status `draft`. It becomes `preregistered` only when the owner approves it at the pre-registration freeze ([ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md)).

| | |
|---|---|
| **Prediction (H1)** | The p95 policy evaluation latency is below 1 ms per decision. cfg-ferrum-nolifecycle's median navigation latency on wl-security-nav-mix (allowed navigations only) and its idle tree private commit are each no more than 5% above cfg-ferrum-nosecurity-bench's. |
| **Null (H0)** | The p95 evaluation latency is at least 1 ms, or either relative overhead is at least 5%. |
| **Practical threshold** | 1 ms p95 per decision; 5% non-inferiority margins (proposed). |
| **Metrics** | [metric-policy-eval-latency](../metrics/metric-policy-eval-latency.md), [metric-nav-latency](../metrics/metric-nav-latency.md), [metric-tree-private-commit](../metrics/metric-tree-private-commit.md) |
| **Experiments** | [exp-security-overhead](../experiments/exp-security-overhead.md) |

## Rationale

Evaluating a policy (URL parsing plus list lookups) should be cheap compared with a navigation. That expectation is UNVERIFIED[phase-p6-benchmark-harness] (re-targeted in P4: p4.12 ran the microbenchmark harness only to show that it works, not as a measurement, [harness run](../../raw/evidence/phase-p4-security/microbench-harness-run.txt); P6 measures it). cfg-ferrum-nosecurity-bench is a benchmark-only build that never loads public sites.

## Decision rule

The statistic, the error control (Holm within the research question's family) and the four-way outcome classification are defined in the analysis plan ([ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md)): practically meaningful, detectable but not meaningful, inconclusive, or evidence of no meaningful difference. A verdict status (`supported`, `not-supported` or `inconclusive`) is set only after the linked experiment is `analyzed` with `results_ref` pointing into `raw/bench/`.

## Integrity notes

- No data exists. Nothing on this page is a result.
- Thresholds marked "proposed" may change only before the pre-registration freeze. Every change gets a `decide` or `plan` log entry, and any later change makes the analysis exploratory.
