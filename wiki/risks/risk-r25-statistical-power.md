---
id: risk-r25
type: risk
title: "Planned sample sizes may be too small to detect practically relevant differences"
status: open
updated: 2026-10-08
sources:
  - raw/research/measurement-methodology.md
  - raw/00-master-prompt.md
related: [phase-p6-benchmark-harness, phase-p7-lifecycle, phase-p8-research-paper, adr-0013, comp-research-analysis, exp-lifecycle-policies, exp-baseline-footprint, risk-r12, risk-r14, qual-testing-strategy]
approvable: true
tags: [statistics, power, methodology]
likelihood: 4
impact: 3
mitigation: "Use the A/A noise floor to size campaigns; preregister primary metrics, comparison families and practical thresholds; correct for multiple comparisons (Holm or Benjamini-Hochberg); report raw differences with bootstrap CIs and effect sizes; preregister any sequential stopping rule; test the analysis code against known datasets."
spike: null
owner_phase: phase-p6-benchmark-harness
trigger: "Confidence intervals straddle the practical threshold for primary metrics; the number of comparisons grows after data collection starts."
fallback: "Add blocks within the time budget, narrow the set of primary comparisons, or report the result as inconclusive."
---

# risk-r25: Planned sample sizes may be too small to detect practically relevant differences

| Likelihood | Impact | Score | Status | Owner phase |
|---|---|---|---|---|
| 4 | 3 | 12 | open | `phase-p6-benchmark-harness` |

Score = likelihood × impact (SCHEMA §6.5). Scales are planning judgements, not measurements. Full register: [ov-risk-register](ov-risk-register.md).

## Description and evidence

The master prompt (§10) targets at least 30 independent trials per major configuration where practical, and asks to distinguish statistically detectable from practically meaningful effects. MM §7.2 (derived, normal approximation, two-sided, power 0.80) shows that with 30 trials per arm only standardized effects of roughly d ≈ 0.72 are detectable at α = 0.05, and about 0.94 at α = 0.005. MM §7.3 to §7.5: SciPy's bootstrap defaults to BCa and can return NaN on degenerate data; report Hedges' g, Cliff's delta and raw differences; correct with Holm or Benjamini-Hochberg.

Sources: [measurement-methodology](../raw/research/measurement-methodology.md), [master prompt](../raw/00-master-prompt.md). Abbreviations: TW = tauri-webview2-capabilities, MM = measurement-methodology, RW = related-work-seed, NX = nextjs-stack, LW = llm-wiki-pattern.

## Early-warning signs (trigger)

Confidence intervals straddle the practical threshold for primary metrics; the number of comparisons grows after data collection starts.

## Mitigation

Use the A/A noise floor to size campaigns; preregister primary metrics, comparison families and practical thresholds; correct for multiple comparisons (Holm or Benjamini-Hochberg); report raw differences with bootstrap CIs and effect sizes; preregister any sequential stopping rule; test the analysis code against known datasets.

## De-risking spike (proposed)

Phase: `phase-p6-benchmark-harness`. Use the A/A campaign (risk-r12 spike) to estimate variance for each primary metric and compute the blocks needed for the preregistered practical threshold.

The `spike` frontmatter field stays `null` until the owning phase page assigns a task id (`pN.M`); the integrator or phase owner then sets it here.

## Fallback if realised

Add blocks within the time budget, narrow the set of primary comparisons, or report the result as inconclusive.

## Unverified claims

None beyond the sources cited above.

## Affects

`phase-p6-benchmark-harness`, `phase-p7-lifecycle`, `phase-p8-research-paper`, `adr-0013`, `comp-research-analysis`, `exp-lifecycle-policies`, `exp-baseline-footprint`, `risk-r12`, `risk-r14`, `qual-testing-strategy`
