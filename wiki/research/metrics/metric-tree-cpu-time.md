---
id: metric-tree-cpu-time
type: metric
title: "Tree CPU time"
status: proposed
updated: 2026-10-08
sources:
  - raw/research/measurement-methodology.md
  - raw/00-master-prompt.md
related:
  - ov-research-fairness-protocol
  - ov-research-plan
  - ov-research-traceability
  - comp-telemetry
  - comp-benchmark-harness
approvable: true
unit: s
definition: "User + kernel CPU time of all processes that were ever in the target's job during the window, including processes that exited; reported per completed workload and as CPU-seconds per wall-clock minute for idle/background windows."
boundary_start: "Start of the measurement window (job accounting snapshot, harness QPC)"
boundary_end: "End of the measurement window (job accounting snapshot)"
method: "Difference of JOBOBJECT_BASIC_ACCOUNTING_INFORMATION TotalUserTime+TotalKernelTime between window end and start. Idle/background windows of at least several minutes (exact length per workload) because idle consumption is small. Process set S(t) follows the product's pre-registered attribution mode (ov-research-fairness-protocol rule 3): job-only, S(t) = every process in the harness-owned Job Object the target was launched into (suspended, fresh profile / user data folder); or, if msedgewebview2.exe processes do not join the job, job ∪ GetProcessExtendedInfos, S(t) = job members plus the PIDs GetProcessExtendedInfos reports for the product's WebView2 environment (Ferrum, cfg-tauri-baseline); never selected by executable name. Crashpad handled symmetrically (included for all products or excluded for all; choice recorded)."
tool: "QueryInformationJobObject (JobObjectBasicAccountingInformation); GetProcessTimes cross-check"
normalization: "Per completed workload (s) or per wall minute (CPU-s/min); never instantaneous %"
support: unverified
phase: phase-p5-telemetry
tags:
  - research
  - metric
unverified:
  - claim: "msedgewebview2.exe processes of Ferrum/baseline join the harness Job Object (measurement note §2.2 UNCERTAIN)"
    verify_in: phase-p6-benchmark-harness
  - claim: "GetProcessTimes granularity is fine enough for the idle/background windows used (checked against QueryProcessCycleTime on an idle process)"
    verify_in: phase-p5-telemetry
---

# Tree CPU time

| Field | Value |
|---|---|
| Unit | s |
| Support | `unverified`. Nothing has been measured yet |
| Validated in | `phase-p5-telemetry` |

**Definition.** User + kernel CPU time of all processes that were ever in the target's job during the window, including processes that exited; reported per completed workload and as CPU-seconds per wall-clock minute for idle/background windows.

**Boundaries.** Start: Start of the measurement window (job accounting snapshot, harness QPC). End: End of the measurement window (job accounting snapshot).

**Method.** Difference of JOBOBJECT_BASIC_ACCOUNTING_INFORMATION TotalUserTime+TotalKernelTime between window end and start. Idle/background windows of at least several minutes (exact length per workload) because idle consumption is small. Process set S(t) follows the product's pre-registered attribution mode (ov-research-fairness-protocol rule 3): job-only, S(t) = every process in the harness-owned Job Object the target was launched into (suspended, fresh profile / user data folder); or, if msedgewebview2.exe processes do not join the job, job ∪ GetProcessExtendedInfos, S(t) = job members plus the PIDs GetProcessExtendedInfos reports for the product's WebView2 environment (Ferrum, cfg-tauri-baseline); never selected by executable name. Crashpad handled symmetrically (included for all products or excluded for all; choice recorded).

**Attribution caveat.** Whether the WebView2 processes of Ferrum and the baseline join the host's Job Object is UNCERTAIN in the [measurement note](../../raw/research/measurement-methodology.md) §2.2 and is UNVERIFIED[phase-p6-benchmark-harness] (first checked in the P1 de-risking spike). The attribution mode per product is fixed from that check and pre-registered before comparative data exists; it is never chosen after seeing data. Job CPU accounting (`TotalUserTime`+`TotalKernelTime`) is valid only when job membership is complete. Otherwise tree CPU time is the sum of per-process `GetProcessTimes` deltas over S(t), with processes that exit inside the window captured before exit; the same source is then used for every product in the comparison.

**Tool.** QueryInformationJobObject (JobObjectBasicAccountingInformation); GetProcessTimes cross-check

**Normalisation.** Per completed workload (s) or per wall minute (CPU-s/min); never instantaneous %

## Notes
- In job-only mode, job accounting includes processes that have already terminated, so short-lived children are counted ([measurement note](../../raw/research/measurement-methodology.md) §2.3 and §3, VERIFIED).
- Timer granularity of GetProcessTimes is UNVERIFIED[phase-p5-telemetry]. Compare it against [metric-tree-cpu-cycles](metric-tree-cpu-cycles.md) on an idle process.
- Windows 11 does not guarantee high timer resolution for windows that are occluded or minimised, and it applies EcoQoS heuristics (§3, VERIFIED). The harness therefore fixes and records the window state (see [ov-research-fairness-protocol](../ov-research-fairness-protocol.md)).

## Used by
Experiments and hypotheses that reference this metric are listed in [ov-research-traceability](../ov-research-traceability.md).
