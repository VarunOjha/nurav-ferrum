---
id: metric-startup-lcp
type: metric
title: "Startup: process start to largest contentful paint of start page"
status: defined
updated: 2026-10-19
sources:
  - raw/research/literature-batch-5.md
  - raw/evidence/phase-p5-telemetry/check-p5.6.txt
  - raw/research/measurement-methodology.md
  - raw/00-master-prompt.md
related:
  - ov-research-plan
  - ov-research-traceability
  - comp-telemetry
  - comp-benchmark-harness
approvable: true
unit: ms
definition: "Elapsed time from T0 to the last largest-contentful-paint entry reported before first user input / page hide for the start page."
boundary_start: T0
boundary_end: "Final LCP entry (largest-contentful-paint PerformanceObserver), converted to harness clock"
method: "As metric-startup-fcp; the fixture has a single deterministic largest element so LCP is well defined."
tool: "Largest Contentful Paint API in fixture page"
normalization: "none (ms)"
support: unverified
phase: phase-p5-telemetry
tags:
  - research
  - metric
unverified:
  - claim: "Ferrum's in-app LCP equals Chrome's for the same page (no side-by-side comparison yet)"
    verify_in: phase-p6-benchmark-harness
---

# Startup: process start to largest contentful paint of start page

| Field | Value |
|---|---|
| Unit | ms |
| Support | `unverified`. Definition final (p5.13). Ferrum's in-app chain records it on this PC ([check-p5.6](../../raw/evidence/phase-p5-telemetry/check-p5.6.txt); startup is not part of the p5.4 meter validation); the harness-side measurement for all products comes in P6 |
| Validated in | `phase-p5-telemetry` |

**Definition.** Elapsed time from T0 to the last largest-contentful-paint entry reported before first user input / page hide for the start page.

**Boundaries.** Start: T0. End: Final LCP entry (largest-contentful-paint PerformanceObserver), converted to harness clock.

**Method.** As metric-startup-fcp; the fixture has a single deterministic largest element so LCP is well defined.

**Tool.** Largest Contentful Paint API in fixture page

**Normalisation.** none (ms)

## In-app chain (p5.6)

Ferrum's own record (`startup_mark` `tab_largest_contentful_paint`, first tab): `performance.timeOrigin` plus the `startTime` of the last `largest-contentful-paint` entry seen by a buffered `PerformanceObserver` within 200 ms, read by the host in an isolated world as for the first contentful paint. WebView2 on this PC reports such entries (observed in the run below); whether the definition matches the current specification is still the open question in the notes. On `/landing` the largest and the first content were drawn in the same frame. In the saved run of [check-p5.6](../../raw/evidence/phase-p5-telemetry/check-p5.6.txt) (fresh profile, debug build, start page `/landing`): process created 0 ms, window visible 107 ms, tab first contentful paint 991 ms, tab largest contentful paint 991 ms, shell first paint 992 ms. One run of a check, not a measurement result.

## Notes
- Definition checked against the specification (p5.13, [literature batch 5](../../raw/research/literature-batch-5.md) L8, Editor's Draft of 26 August 2026): candidates are images and text, sized by their visible area; reporting "terminates whenever scroll or input events occur"; an entry's `startTime` is its render time. Ferrum's value, the `startTime` of the last entry seen with no input or scroll before it is read (p5.6, p5.11), is therefore the specification's largest contentful paint. WebView2 reports such entries (the p5.6 run). That it equals Chrome's value for the same page is UNVERIFIED[phase-p6-benchmark-harness] (no side-by-side run yet; the harness runs both). The specification also warns that pages loaded off-screen, such as in background tabs, report larger values.

## Used by
Experiments and hypotheses that reference this metric are listed in [ov-research-traceability](../ov-research-traceability.md).
