---
id: metric-frame-interval
type: metric
title: "Frame presentation interval"
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
unit: ms
definition: "Per presented frame of the product's GPU/compositor process: MsBetweenPresents (and MsBetweenDisplayChange for displayed frames) during the animation/scroll phase; per trial summarised by median, p95, p99."
boundary_start: "Start of the scripted scroll/animation phase (harness QPC, mapped to ETW time)"
boundary_end: "End of the scripted scroll/animation phase"
method: "PresentMon capture filtered to the product's GPU process PID (from job membership); PresentMode recorded and compared across products."
tool: "PresentMon (ETW, requires elevation); run as a separate elevated sampler process"
normalization: "ms; ratio to competitor for non-inferiority"
support: unverified
phase: phase-p6-benchmark-harness
tags:
  - research
  - metric
unverified:
  - claim: "Whether Chromium presents come from the GPU process for every product, and how an embedded WebView2 composites compared with a browser window"
    verify_in: phase-p6-benchmark-harness
---

# Frame presentation interval

| Field | Value |
|---|---|
| Unit | ms |
| Support | `unverified`. Nothing has been measured yet |
| Validated in | `phase-p6-benchmark-harness` |

**Definition.** Per presented frame of the product's GPU/compositor process: MsBetweenPresents (and MsBetweenDisplayChange for displayed frames) during the animation/scroll phase; per trial summarised by median, p95, p99.

**Boundaries.** Start: Start of the scripted scroll/animation phase (harness QPC, mapped to ETW time). End: End of the scripted scroll/animation phase.

**Method.** PresentMon capture filtered to the product's GPU process PID (from job membership); PresentMode recorded and compared across products.

**Tool.** PresentMon (ETW, requires elevation); run as a separate elevated sampler process

**Normalisation.** ms; ratio to competitor for non-inferiority

## Notes
- PresentMon reports per-present data, needs elevation, and targets one process ([measurement note](../../raw/research/measurement-methodology.md) §4.1, VERIFIED tool and metrics).
- Whether Chromium presents come from the GPU process for every product, and how an embedded WebView2 composites compared with a browser window, are both UNVERIFIED[phase-p6-benchmark-harness]. If the present paths differ, the comparison is labelled "not like-for-like" in the threats page.
- Target applications must not run elevated, because the WebView2 environment-variable flags are ignored for elevated processes ([Tauri/WebView2 note](../../raw/research/tauri-webview2-capabilities.md) §7, VERIFIED). Only the sampler is elevated.

## Used by
Experiments and hypotheses that reference this metric are listed in [ov-research-traceability](../ov-research-traceability.md).
