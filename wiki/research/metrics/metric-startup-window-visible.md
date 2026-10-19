---
id: metric-startup-window-visible
type: metric
title: "Startup: process start to first window visible (T0 to T1)"
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
definition: "Elapsed time from the harness creating the target process (T0) to the first top-level window owned by a job process becoming visible (T1)."
boundary_start: "T0: harness QPC timestamp immediately before CreateProcess (suspended) followed by ResumeThread; T0 is taken at ResumeThread"
boundary_end: "T1: first show event of a top-level window owned by a job process (Win32 event hook or ETW)"
method: "One measurement per launch. Fresh-profile start and warm start (second launch on the same profile) are separate conditions; true cold start (file cache flushed) only if a flush method is validated."
tool: "Rust orchestrator: QueryPerformanceCounter, CreateProcess/ResumeThread, SetWinEventHook or ETW (mechanism to be verified in phase-p5-telemetry)"
normalization: "none (ms)"
support: unverified
phase: phase-p5-telemetry
tags:
  - research
  - metric
unverified:
  - claim: "The mechanism for detecting T1 from the harness (outside the product)"
    verify_in: phase-p6-benchmark-harness
  - claim: "A method for flushing the standby list to get a true cold start"
    verify_in: phase-p6-benchmark-harness
---

# Startup: process start to first window visible (T0 to T1)

| Field | Value |
|---|---|
| Unit | ms |
| Support | `unverified`. Definition final (p5.13). Ferrum's in-app chain records it on this PC ([check-p5.6](../../raw/evidence/phase-p5-telemetry/check-p5.6.txt); startup is not part of the p5.4 meter validation); the harness-side measurement for all products comes in P6 |
| Validated in | `phase-p5-telemetry` |

**Definition.** Elapsed time from the harness creating the target process (T0) to the first top-level window owned by a job process becoming visible (T1).

**Boundaries.** Start: T0: harness QPC timestamp immediately before CreateProcess (suspended) followed by ResumeThread; T0 is taken at ResumeThread. End: T1: first show event of a top-level window owned by a job process (Win32 event hook or ETW).

**Method.** One measurement per launch. Fresh-profile start and warm start (second launch on the same profile) are separate conditions; true cold start (file cache flushed) only if a flush method is validated.

**Tool.** Rust orchestrator: QueryPerformanceCounter, CreateProcess/ResumeThread, SetWinEventHook or ETW (mechanism to be verified in phase-p5-telemetry)

**Normalisation.** none (ms)

## In-app chain (p5.6)

Ferrum's own record of this boundary (comp-telemetry, `startup_mark` `window_visible`): the wall-clock time right after Tauri has built the main window, which it shows while building it (checked with `is_visible`). T0 in-app is Ferrum's process creation time (`GetProcessTimes`), not the harness's ResumeThread, so in-app values can be up to the launch overhead shorter than harness values. The window is shown before the shell has drawn anything. In the saved run of [check-p5.6](../../raw/evidence/phase-p5-telemetry/check-p5.6.txt) (fresh profile, debug build, start page `/landing`): process created 0 ms, window visible 107 ms, tab first contentful paint 991 ms, tab largest contentful paint 991 ms, shell first paint 992 ms. One run of a check, not a measurement result.

## Notes
- The harness's mechanism for detecting T1 is UNVERIFIED[phase-p6-benchmark-harness] ([measurement note](../../raw/research/measurement-methodology.md) §4.2). Re-targeted from P5 on 2026-10-18: P5 built only Ferrum's in-app chain (below); the harness, which must detect T1 the same way for every product, is built in P6.
- Edge Startup Boost can pre-launch Edge processes, so it is disabled by policy (`StartupBoostEnabled`=0) for this metric and no `msedge.exe` may run before T0 (§4.2, VERIFIED policy text).
- For Ferrum, "visible" means the shell window. When Ferrum's window is visible, the tab WebView may still be blank. That is why [metric-startup-fcp](metric-startup-fcp.md) is the user-facing companion metric.
- A method for flushing the standby list to get a true cold start is UNVERIFIED[phase-p6-benchmark-harness]. Without one, results are labelled "fresh-profile start" and are never called cold.

## Used by
Experiments and hypotheses that reference this metric are listed in [ov-research-traceability](../ov-research-traceability.md).
