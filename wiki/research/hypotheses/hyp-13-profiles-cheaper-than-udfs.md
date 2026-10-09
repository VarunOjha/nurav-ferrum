---
id: hyp-13
type: hypothesis
title: "Per-site profiles cost less memory per site than per-site user data folders"
status: draft
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/research/measurement-methodology.md
  - raw/research/related-work-seed.md
  - raw/research/tauri-webview2-capabilities.md
related:
  - rq-06
  - exp-isolation-overhead
  - ov-research-statistical-analysis-plan
approvable: true
rq: rq-06
prediction: "On wl-multi-active, varying the number of distinct sites, the marginal tree private commit per additional site is lower under cfg-ferrum-profile-per-site than under cfg-ferrum-udf-per-site."
null_hypothesis: "The marginal cost per site under profiles is greater than or equal to that under per-site user data folders."
metrics:
  - metric-tree-private-commit
  - metric-process-count
experiments:
  - exp-isolation-overhead
practical_threshold: "Relative difference in marginal cost of at least 10% (proposed)."
phase: phase-p6-benchmark-harness
tags:
  - research
  - preregistration-candidate
---

# HYP-13: Per-site profiles cost less memory per site than per-site user data folders

Research question: [rq-06](../questions/rq-06-isolation.md). Status `draft`. It becomes `preregistered` only when the owner approves it at the pre-registration freeze ([ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md)).

| | |
|---|---|
| **Prediction (H1)** | On wl-multi-active, varying the number of distinct sites, the marginal tree private commit per additional site is lower under cfg-ferrum-profile-per-site than under cfg-ferrum-udf-per-site. |
| **Null (H0)** | The marginal cost per site under profiles is greater than or equal to that under per-site user data folders. |
| **Practical threshold** | Relative difference in marginal cost of at least 10% (proposed). |
| **Metrics** | [metric-tree-private-commit](../metrics/metric-tree-private-commit.md), [metric-process-count](../metrics/metric-process-count.md) |
| **Experiments** | [exp-isolation-overhead](../experiments/exp-isolation-overhead.md) |

## Rationale

Each user data folder gets its own browser process group, and profiles share one folder's process group ([Tauri/WebView2 note](../../raw/research/tauri-webview2-capabilities.md) §6, VERIFIED from Microsoft docs). Pre-registered **condition**: if per-site profiles cannot be implemented (`risk-r01`, Tauri 2.12.1 does not expose profile names), the hypothesis is `withdrawn` and the reason is logged.

## Decision rule

The statistic, the error control (Holm within the research question's family) and the four-way outcome classification are defined in the analysis plan ([ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md)): practically meaningful, detectable but not meaningful, inconclusive, or evidence of no meaningful difference. A verdict status (`supported`, `not-supported` or `inconclusive`) is set only after the linked experiment is `analyzed` with `results_ref` pointing into `raw/bench/`.

## Integrity notes

- No data exists. Nothing on this page is a result.
- Thresholds marked "proposed" may change only before the pre-registration freeze. Every change gets a `decide` or `plan` log entry, and any later change makes the analysis exploratory.
