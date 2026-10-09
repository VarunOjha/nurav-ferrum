---
id: metric-crash-count
type: metric
title: "Crash / process-failure count"
status: proposed
updated: 2026-10-08
sources:
  - raw/research/measurement-methodology.md
  - raw/00-master-prompt.md
  - raw/research/tauri-webview2-capabilities.md
related:
  - ov-research-plan
  - ov-research-traceability
  - comp-telemetry
  - comp-benchmark-harness
approvable: true
unit: count
definition: "Number of renderer, GPU or browser process failures (and unresponsive-renderer events) per trial and per hour of runtime."
boundary_start: "Trial start"
boundary_end: "Trial end"
method: "Ferrum: ProcessFailed events via raw COM; all products: unexpected job-member exits with non-zero exit code; induced crashes (fault-injection fixtures) counted separately from spontaneous ones."
tool: "WebView2 ProcessFailed (raw COM); Job Object exit notifications"
normalization: "per hour; exact Poisson interval"
support: unverified
phase: phase-p6-benchmark-harness
tags:
  - research
  - metric
unverified:
  - claim: "How to trigger a renderer crash on purpose in each product (for example a crash URL or a CDP command)"
    verify_in: phase-p6-benchmark-harness
---

# Crash / process-failure count

| Field | Value |
|---|---|
| Unit | count |
| Support | `unverified`. Nothing has been measured yet |
| Validated in | `phase-p6-benchmark-harness` |

**Definition.** Number of renderer, GPU or browser process failures (and unresponsive-renderer events) per trial and per hour of runtime.

**Boundaries.** Start: Trial start. End: Trial end.

**Method.** Ferrum: ProcessFailed events via raw COM; all products: unexpected job-member exits with non-zero exit code; induced crashes (fault-injection fixtures) counted separately from spontaneous ones.

**Tool.** WebView2 ProcessFailed (raw COM); Job Object exit notifications

**Normalisation.** per hour; exact Poisson interval

## Notes
- In Tauri and wry, ProcessFailed is reachable only through raw COM ([Tauri/WebView2 note](../../raw/research/tauri-webview2-capabilities.md) §6, VERIFIED).
- How to trigger a renderer crash on purpose in each product (for example a crash URL or a CDP command) is UNVERIFIED[phase-p6-benchmark-harness].

## Used by
Experiments and hypotheses that reference this metric are listed in [ov-research-traceability](../ov-research-traceability.md).
