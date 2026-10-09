---
id: metric-nav-latency
type: metric
title: "Navigation latency"
status: proposed
updated: 2026-10-08
sources:
  - raw/research/measurement-methodology.md
  - raw/00-master-prompt.md
related:
  - ov-research-plan
  - ov-research-traceability
  - comp-telemetry
  - comp-benchmark-harness
approvable: true
unit: ms
definition: "Per navigation: PerformanceNavigationTiming.loadEventEnd minus startTime of the destination document, as recorded by the destination page; per trial summarised by median and (when sample size permits) p95/p99 over the trial's navigations."
boundary_start: "Navigation startTime of the destination document (Navigation Timing, page clock)"
boundary_end: "loadEventEnd of the destination document (Navigation Timing, page clock)"
method: "Fixture pages beacon their Navigation Timing entry to the fixture server. Navigations triggered identically in every product (in-page link click / location assignment issued over the common CDP connection). Scenario label per navigation: same-origin, cross-origin, cross-site, redirect (301/302/307 chain length), back/forward, cached, uncached."
tool: "Navigation Timing Level 2 in fixture pages; fixture server; Playwright connectOverCDP for triggering"
normalization: "none (ms); ratio to competitor median for non-inferiority tests"
support: unverified
phase: phase-p5-telemetry
tags:
  - research
  - metric
unverified:
  - claim: "bfcache / PerformanceNavigationTiming.type behaves the same in WebView2"
    verify_in: phase-p5-telemetry
---

# Navigation latency

| Field | Value |
|---|---|
| Unit | ms |
| Support | `unverified`. Nothing has been measured yet |
| Validated in | `phase-p5-telemetry` |

**Definition.** Per navigation: PerformanceNavigationTiming.loadEventEnd minus startTime of the destination document, as recorded by the destination page; per trial summarised by median and (when sample size permits) p95/p99 over the trial's navigations.

**Boundaries.** Start: Navigation startTime of the destination document (Navigation Timing, page clock). End: loadEventEnd of the destination document (Navigation Timing, page clock).

**Method.** Fixture pages beacon their Navigation Timing entry to the fixture server. Navigations triggered identically in every product (in-page link click / location assignment issued over the common CDP connection). Scenario label per navigation: same-origin, cross-origin, cross-site, redirect (301/302/307 chain length), back/forward, cached, uncached.

**Tool.** Navigation Timing Level 2 in fixture pages; fixture server; Playwright connectOverCDP for triggering

**Normalisation.** none (ms); ratio to competitor median for non-inferiority tests

## Notes
- The navigation is measured inside the page, so the latency of the CDP command does not enter the measurement. This holds only as long as every product is triggered the same way, which the fairness protocol requires ([ov-research-fairness-protocol](../ov-research-fairness-protocol.md)).
- Back/forward navigations may come from the bfcache, so their timing entries differ. Bfcache use is recorded per navigation (`PerformanceNavigationTiming.type`). Whether this works the same in WebView2 is UNVERIFIED[phase-p5-telemetry].
- Percentile rule: see [ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md). p95 and p99 are reported only when enough navigations exist per trial.

## Used by
Experiments and hypotheses that reference this metric are listed in [ov-research-traceability](../ov-research-traceability.md).
