---
id: hyp-11
type: hypothesis
title: "No lifecycle policy discards a protected session"
status: draft
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/research/measurement-methodology.md
  - raw/research/related-work-seed.md
related:
  - rq-04
  - exp-lifecycle-policies
  - ov-research-statistical-analysis-plan
approvable: true
rq: rq-04
prediction: "Across all confirmatory trials of cfg-ferrum-fixed-idle, cfg-ferrum-mempressure and cfg-ferrum-adaptive, the number of safety violations is zero."
null_hypothesis: "At least one safety violation occurs."
metrics:
  - metric-safety-violations
experiments:
  - exp-lifecycle-policies
practical_threshold: "Zero tolerance. The exact one-sided 95% upper bound on the violation rate per protected-session exposure is reported."
phase: phase-p7-lifecycle
tags:
  - research
  - preregistration-candidate
---

# HYP-11: No lifecycle policy discards a protected session

Research question: [rq-04](../questions/rq-04-lifecycle-policies.md). Status `draft`. It becomes `preregistered` only when the owner approves it at the pre-registration freeze ([ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md)).

| | |
|---|---|
| **Prediction (H1)** | Across all confirmatory trials of cfg-ferrum-fixed-idle, cfg-ferrum-mempressure and cfg-ferrum-adaptive, the number of safety violations is zero. |
| **Null (H0)** | At least one safety violation occurs. |
| **Practical threshold** | Zero tolerance. The exact one-sided 95% upper bound on the violation rate per protected-session exposure is reported. |
| **Metrics** | [metric-safety-violations](../metrics/metric-safety-violations.md) |
| **Experiments** | [exp-lifecycle-policies](../experiments/exp-lifecycle-policies.md) |

## Rationale

Master prompt §5 Phase 4: never discard during a potentially destructive operation without an explicit safety mechanism. The exemption checklist follows Chrome's freezing exemptions ([seed](../../raw/research/related-work-seed.md) A3).

## Decision rule

The statistic, the error control (Holm within the research question's family) and the four-way outcome classification are defined in the analysis plan ([ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md)): practically meaningful, detectable but not meaningful, inconclusive, or evidence of no meaningful difference. A verdict status (`supported`, `not-supported` or `inconclusive`) is set only after the linked experiment is `analyzed` with `results_ref` pointing into `raw/bench/`.

## Integrity notes

- No data exists. Nothing on this page is a result.
- Thresholds marked "proposed" may change only before the pre-registration freeze. Every change gets a `decide` or `plan` log entry, and any later change makes the analysis exploratory.
