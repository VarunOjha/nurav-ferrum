---
id: metric-restore-latency
type: metric
title: "Background-tab activation-to-ready latency"
status: proposed
updated: 2026-10-08
sources:
  - raw/research/measurement-methodology.md
  - raw/00-master-prompt.md
  - raw/research/related-work-seed.md
related:
  - ov-research-plan
  - ov-research-traceability
  - comp-telemetry
  - comp-benchmark-harness
approvable: true
unit: ms
definition: "For each scripted activation of a background tab: time from the harness-issued activation command to the tab's fixture page reporting 'ready' (visible + first contentful paint after activation, or pageshow/resume signal if not reloaded). Includes full reload when the tab had been discarded and resume time when it had been suspended."
boundary_start: "Harness issues tab-activation (same mechanism for all configurations under comparison)"
boundary_end: "Fixture page beacon 'ready' after becoming visible (visibilitychange to visible plus next paint, or FCP after reload)"
method: "Per trial summarised by mean and p95 over all activations; lifecycle state before activation (ACTIVE, BACKGROUND, IDLE, DISCARD_CANDIDATE, DISCARDED) recorded per event."
tool: "Ferrum telemetry (lifecycle transitions) + fixture beacons; harness clock"
normalization: "ms; for J divided by same-block value of cfg-ferrum-nolifecycle"
support: unverified
phase: phase-p7-lifecycle
tags:
  - research
  - metric
unverified:
  - claim: "How Chrome and Edge tabs are activated identically to Ferrum tabs over CDP"
    verify_in: phase-p6-benchmark-harness
  - claim: "Whether WebView2 fires page freeze / resume events on TrySuspend"
    verify_in: phase-p7-lifecycle
---

# Background-tab activation-to-ready latency

| Field | Value |
|---|---|
| Unit | ms |
| Support | `unverified`. Nothing has been measured yet |
| Validated in | `phase-p7-lifecycle` |

**Definition.** For each scripted activation of a background tab: time from the harness-issued activation command to the tab's fixture page reporting 'ready' (visible + first contentful paint after activation, or pageshow/resume signal if not reloaded). Includes full reload when the tab had been discarded and resume time when it had been suspended.

**Boundaries.** Start: Harness issues tab-activation (same mechanism for all configurations under comparison). End: Fixture page beacon 'ready' after becoming visible (visibilitychange to visible plus next paint, or FCP after reload).

**Method.** Per trial summarised by mean and p95 over all activations; lifecycle state before activation (ACTIVE, BACKGROUND, IDLE, DISCARD_CANDIDATE, DISCARDED) recorded per event.

**Tool.** Ferrum telemetry (lifecycle transitions) + fixture beacons; harness clock

**Normalisation.** ms; for J divided by same-block value of cfg-ferrum-nolifecycle

## Notes
- This metric exists in every configuration, including ones without lifecycle management where it is just the tab-switch latency. That is why it can be normalised against [cfg-ferrum-nolifecycle](../ov-research-configurations.md) for the objective function ([ov-research-objective-function](../ov-research-objective-function.md)).
- How Chrome and Edge tabs are activated identically to Ferrum tabs over CDP is UNVERIFIED[phase-p6-benchmark-harness]. If it cannot be done, the metric is compared only between Ferrum configurations.
- Whether WebView2 fires page `freeze`/`resume` events on TrySuspend is UNVERIFIED[phase-p7-lifecycle] ([related-work seed](../../raw/research/related-work-seed.md) A2).

## Used by
Experiments and hypotheses that reference this metric are listed in [ov-research-traceability](../ov-research-traceability.md).
