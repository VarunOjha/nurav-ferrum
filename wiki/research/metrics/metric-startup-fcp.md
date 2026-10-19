---
id: metric-startup-fcp
type: metric
title: "Startup: process start to first contentful paint of start page"
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
definition: "Elapsed time from T0 to the first-contentful-paint entry of the configured start page (wl-static-info fixture) in the first tab."
boundary_start: "T0 (as in metric-startup-window-visible)"
boundary_end: "FCP: PerformanceObserver paint entry first-contentful-paint, converted to the harness clock via performance.timeOrigin"
method: "The fixture page reports performance.timeOrigin + FCP startTime to the fixture server (no Ferrum IPC involved); harness converts wall-clock to its timeline using a QPC-to-system-time mapping recorded at T0."
tool: "Paint Timing API in fixture page; fixture server log; GetSystemTimePreciseAsFileTime + QPC on harness side"
normalization: "none (ms)"
support: unverified
phase: phase-p5-telemetry
tags:
  - research
  - metric
unverified:
  - claim: "How accurately the page wall clock and the harness QPC clock line up"
    verify_in: phase-p6-benchmark-harness
---

# Startup: process start to first contentful paint of start page

| Field | Value |
|---|---|
| Unit | ms |
| Support | `unverified`. Definition final (p5.13). Ferrum's in-app chain records it on this PC ([check-p5.6](../../raw/evidence/phase-p5-telemetry/check-p5.6.txt); startup is not part of the p5.4 meter validation); the harness-side measurement for all products comes in P6 |
| Validated in | `phase-p5-telemetry` |

**Definition.** Elapsed time from T0 to the first-contentful-paint entry of the configured start page (wl-static-info fixture) in the first tab.

**Boundaries.** Start: T0 (as in metric-startup-window-visible). End: FCP: PerformanceObserver paint entry first-contentful-paint, converted to the harness clock via performance.timeOrigin.

**Method.** The fixture page reports performance.timeOrigin + FCP startTime to the fixture server (no Ferrum IPC involved); harness converts wall-clock to its timeline using a QPC-to-system-time mapping recorded at T0.

**Tool.** Paint Timing API in fixture page; fixture server log; GetSystemTimePreciseAsFileTime + QPC on harness side

**Normalisation.** none (ms)

## In-app chain (p5.6)

Ferrum's own record (`startup_mark` `tab_first_contentful_paint`, first tab of the strip): `performance.timeOrigin` plus the `first-contentful-paint` entry's `startTime`, read by the host through DevTools calls (`Page.createIsolatedWorld`, then `Runtime.evaluate` in that isolated world, so page script can neither send nor change the value; no IPC from page script). The shell's first paint is read the same way from the `first-paint` entry (`first-contentful-paint` if absent). Both are counted from Ferrum's process creation time on the system wall clock. In the saved run of [check-p5.6](../../raw/evidence/phase-p5-telemetry/check-p5.6.txt) (fresh profile, debug build, start page `/landing`): process created 0 ms, window visible 107 ms, tab first contentful paint 991 ms, tab largest contentful paint 991 ms, shell first paint 992 ms. One run of a check, not a measurement result.

## Notes
- Definition check (p5.13, [literature batch 5](../../raw/research/literature-batch-5.md) L7): Paint Timing defines first contentful paint as the first rendering of image or text content from the DOM and an entry's `startTime` as the paint's time; Ferrum reads that entry, as defined.
- Paint Timing caveats apply: background-tab entries are ignored, the bfcache is not reported, and prerendered pages use `activationStart` ([measurement note](../../raw/research/measurement-methodology.md) §4.2, VERIFIED).
- How accurately the page wall clock and the harness QPC clock line up is UNVERIFIED[phase-p6-benchmark-harness]. Measure the offset error with a loopback timestamp echo. Re-targeted from P5 on 2026-10-18: the harness clock exists only from P6; the in-app chain (above) uses the system wall clock on both sides.
- "Time to interactive" is **not** used. It was removed from Lighthouse 10 (§4.2, VERIFIED). This replaces the master prompt's "time to interactive state" and the change must be stated in the paper.

## Used by
Experiments and hypotheses that reference this metric are listed in [ov-research-traceability](../ov-research-traceability.md).
