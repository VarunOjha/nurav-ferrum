---
id: metric-nav-latency
type: metric
title: "Navigation latency"
status: proposed
updated: 2026-10-18
sources:
  - raw/evidence/phase-p5-telemetry/check-p5.7.txt
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

## In-app record (p5.7)

Ferrum's own record of each navigation (comp-telemetry, `nav_timing`). This is the in-app view, not the cross-browser measurement of record (the fixture beacon above, built with the harness in P6).

- **Start and completion** come from the host: the first WebView2 `NavigationStarting` of the navigation (on the run clock) and its `NavigationCompleted` (milliseconds after the start).
- **First response, DOMContentLoaded and load** are the destination page's `responseStart`, `domContentLoadedEventStart` and `loadEventEnd`, milliseconds after its own `startTime`, read by the host in an isolated world (page script cannot send or change them). The in-app latency matching the definition above is `load_ms`.
- **Redirect count** is counted by the host (each redirected hop); the page's `redirectCount` is 0 after a redirect from another origin. **Origin label:** same or other origin than the tab's previous loaded page; the scenario labels above (cross-site, back/forward, cached) are not in the in-app record.
- **Run (check-p5.7)**: ten loads, each with the right redirect count and label and the page times in order; the page's own `redirectCount` matched the host's for every same-site redirect and was 0 for the redirect to another site (host 1); `load_ms` 14.0 to 92.4 ms (debug build, local test server, one run, not a result). bfcache behaviour is still open (below).

## Notes
- The navigation is measured inside the page, so the latency of the CDP command does not enter the measurement. This holds only as long as every product is triggered the same way, which the fairness protocol requires ([ov-research-fairness-protocol](../ov-research-fairness-protocol.md)).
- Back/forward navigations may come from the bfcache, so their timing entries differ. Bfcache use is recorded per navigation (`PerformanceNavigationTiming.type`). Whether this works the same in WebView2 is UNVERIFIED[phase-p5-telemetry].
- Percentile rule: see [ov-research-statistical-analysis-plan](../ov-research-statistical-analysis-plan.md). p95 and p99 are reported only when enough navigations exist per trial.

## Used by
Experiments and hypotheses that reference this metric are listed in [ov-research-traceability](../ov-research-traceability.md).
