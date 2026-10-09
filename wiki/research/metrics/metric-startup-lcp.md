---
id: metric-startup-lcp
type: metric
title: "Startup: process start to largest contentful paint of start page"
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
  - claim: "The LCP definition used here (final largest-contentful-paint entry before first input/hide) matches the current spec and behaves identically in WebView2 154"
    verify_in: phase-p5-telemetry
---

# Startup: process start to largest contentful paint of start page

| Field | Value |
|---|---|
| Unit | ms |
| Support | `unverified`. Nothing has been measured yet |
| Validated in | `phase-p5-telemetry` |

**Definition.** Elapsed time from T0 to the last largest-contentful-paint entry reported before first user input / page hide for the start page.

**Boundaries.** Start: T0. End: Final LCP entry (largest-contentful-paint PerformanceObserver), converted to harness clock.

**Method.** As metric-startup-fcp; the fixture has a single deterministic largest element so LCP is well defined.

**Tool.** Largest Contentful Paint API in fixture page

**Normalisation.** none (ms)

## Notes
- LCP semantics were not re-read in the research session, so the definition is UNVERIFIED[phase-p5-telemetry] ([measurement note](../../raw/research/measurement-methodology.md) §4.2 marks LCP UNCERTAIN). Read the primary specification before relying on it.

## Used by
Experiments and hypotheses that reference this metric are listed in [ov-research-traceability](../ov-research-traceability.md).
