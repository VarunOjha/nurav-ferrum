---
id: metric-restore-success-rate
type: metric
title: "Session restoration success rate"
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
unit: ratio
definition: "Fraction of sessions (tabs with URL, scroll position and fixture-held state token) correctly restored after application restart or after DISCARDED->RESTORING."
boundary_start: "Restart / restore command"
boundary_end: "Fixture verification beacon (URL + state token match) or timeout"
method: "Fixture pages persist a deterministic token in their own storage; success = same URL and token readable after restore. Per trial count; pooled with exact binomial interval."
tool: "Fixture pages + fixture server + harness"
normalization: proportion
support: unverified
phase: phase-p6-benchmark-harness
tags:
  - research
  - metric
---

# Session restoration success rate

| Field | Value |
|---|---|
| Unit | ratio |
| Support | `unverified`. Nothing has been measured yet |
| Validated in | `phase-p6-benchmark-harness` |

**Definition.** Fraction of sessions (tabs with URL, scroll position and fixture-held state token) correctly restored after application restart or after DISCARDED->RESTORING.

**Boundaries.** Start: Restart / restore command. End: Fixture verification beacon (URL + state token match) or timeout.

**Method.** Fixture pages persist a deterministic token in their own storage; success = same URL and token readable after restore. Per trial count; pooled with exact binomial interval.

**Tool.** Fixture pages + fixture server + harness

**Normalisation.** proportion

## Notes
Restoring a session in Ferrum is a P3 feature (`phase-p3-tabs-sessions`). The success criteria above are proposed and are frozen at pre-registration.

## Used by
Experiments and hypotheses that reference this metric are listed in [ov-research-traceability](../ov-research-traceability.md).
