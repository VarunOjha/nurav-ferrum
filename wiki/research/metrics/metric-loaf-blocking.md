---
id: metric-loaf-blocking
type: metric
title: "Long-animation-frame blocking time"
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
definition: "Sum of blockingDuration of long-animation-frame entries per minute of the interaction phase; plus count of LoAF entries."
boundary_start: "Start of interaction phase (page clock)"
boundary_end: "End of interaction phase (page clock)"
method: "PerformanceObserver type long-animation-frame in fixture page; beacon to fixture server."
tool: "Long Animation Frames API"
normalization: "ms per minute"
support: unverified
phase: phase-p5-telemetry
tags:
  - research
  - metric
unverified:
  - claim: "Long Animation Frames API is available in WebView2 154"
    verify_in: phase-p5-telemetry
---

# Long-animation-frame blocking time

| Field | Value |
|---|---|
| Unit | ms |
| Support | `unverified`. Nothing has been measured yet |
| Validated in | `phase-p5-telemetry` |

**Definition.** Sum of blockingDuration of long-animation-frame entries per minute of the interaction phase; plus count of LoAF entries.

**Boundaries.** Start: Start of interaction phase (page clock). End: End of interaction phase (page clock).

**Method.** PerformanceObserver type long-animation-frame in fixture page; beacon to fixture server.

**Tool.** Long Animation Frames API

**Normalisation.** ms per minute

## Notes
- This is a responsiveness signal: it counts rendering updates delayed by more than 50 ms ([measurement note](../../raw/research/measurement-methodology.md) §4.1, VERIFIED, shipped in Chrome 123).
- Availability in WebView2 154 is UNVERIFIED[phase-p5-telemetry].

## Used by
Experiments and hypotheses that reference this metric are listed in [ov-research-traceability](../ov-research-traceability.md).
