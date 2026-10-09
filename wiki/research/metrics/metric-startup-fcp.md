---
id: metric-startup-fcp
type: metric
title: "Startup: process start to first contentful paint of start page"
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
    verify_in: phase-p5-telemetry
---

# Startup: process start to first contentful paint of start page

| Field | Value |
|---|---|
| Unit | ms |
| Support | `unverified`. Nothing has been measured yet |
| Validated in | `phase-p5-telemetry` |

**Definition.** Elapsed time from T0 to the first-contentful-paint entry of the configured start page (wl-static-info fixture) in the first tab.

**Boundaries.** Start: T0 (as in metric-startup-window-visible). End: FCP: PerformanceObserver paint entry first-contentful-paint, converted to the harness clock via performance.timeOrigin.

**Method.** The fixture page reports performance.timeOrigin + FCP startTime to the fixture server (no Ferrum IPC involved); harness converts wall-clock to its timeline using a QPC-to-system-time mapping recorded at T0.

**Tool.** Paint Timing API in fixture page; fixture server log; GetSystemTimePreciseAsFileTime + QPC on harness side

**Normalisation.** none (ms)

## Notes
- Paint Timing caveats apply: background-tab entries are ignored, the bfcache is not reported, and prerendered pages use `activationStart` ([measurement note](../../raw/research/measurement-methodology.md) §4.2, VERIFIED).
- How accurately the page wall clock and the harness QPC clock line up is UNVERIFIED[phase-p5-telemetry]. Measure the offset error with a loopback timestamp echo.
- "Time to interactive" is **not** used. It was removed from Lighthouse 10 (§4.2, VERIFIED). This replaces the master prompt's "time to interactive state" and the change must be stated in the paper.

## Used by
Experiments and hypotheses that reference this metric are listed in [ov-research-traceability](../ov-research-traceability.md).
