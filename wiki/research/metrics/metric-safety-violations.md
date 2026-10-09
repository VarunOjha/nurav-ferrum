---
id: metric-safety-violations
type: metric
title: "Lifecycle safety violations"
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
unit: count
definition: "Number of lifecycle transitions into DISCARDED (or suspension, where the rule forbids it) of a session that a safety rule marks protected at that moment (media playing, active download, user exclusion, unsaved-form-risk, active capture/device API, Web Locks / IndexedDB blocking)."
boundary_start: "Trial start"
boundary_end: "Trial end"
method: "Fixture pages declare their protection state to the fixture server; Ferrum telemetry logs every transition; analysis joins the two by time and tab id."
tool: "Ferrum telemetry (comp-resource-manager transitions) + fixture server log"
normalization: "count per trial; pooled rate with exact one-sided upper bound"
support: unverified
phase: phase-p7-lifecycle
tags:
  - research
  - metric
---

# Lifecycle safety violations

| Field | Value |
|---|---|
| Unit | count |
| Support | `unverified`. Nothing has been measured yet |
| Validated in | `phase-p7-lifecycle` |

**Definition.** Number of lifecycle transitions into DISCARDED (or suspension, where the rule forbids it) of a session that a safety rule marks protected at that moment (media playing, active download, user exclusion, unsaved-form-risk, active capture/device API, Web Locks / IndexedDB blocking).

**Boundaries.** Start: Trial start. End: Trial end.

**Method.** Fixture pages declare their protection state to the fixture server; Ferrum telemetry logs every transition; analysis joins the two by time and tab id.

**Tool.** Ferrum telemetry (comp-resource-manager transitions) + fixture server log

**Normalisation.** count per trial; pooled rate with exact one-sided upper bound

## Notes
- The exemption categories come from master prompt §5 Phase 4 ([raw/00-master-prompt.md](../../raw/00-master-prompt.md)) and from Chrome's freezing exemptions ([related-work seed](../../raw/research/related-work-seed.md) A3, VERIFIED).
- The deterministic safety **tests** belong to the quality pages owned by another area. This metric counts violations under benchmark workloads.

## Used by
Experiments and hypotheses that reference this metric are listed in [ov-research-traceability](../ov-research-traceability.md).
