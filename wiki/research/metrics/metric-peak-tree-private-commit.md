---
id: metric-peak-tree-private-commit
type: metric
title: "Peak tree private commit"
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
unit: bytes
definition: "Maximum over the window of the summed tree private commit; preferred source is the Job Object PeakJobMemoryUsed when job membership is complete (otherwise the sampled maximum), cross-checked against the maximum of the 1 s sampled sum."
boundary_start: "Job creation (target launched suspended into the job)"
boundary_end: "End of the workload measurement window"
method: "Read JOBOBJECT_EXTENDED_LIMIT_INFORMATION.PeakJobMemoryUsed at window end; also max_t of the sampled sum. Never the sum of per-process peaks. Process set S(t) follows the product's pre-registered attribution mode (ov-research-fairness-protocol rule 3): job-only, S(t) = every process in the harness-owned Job Object the target was launched into (suspended, fresh profile / user data folder); or, if msedgewebview2.exe processes do not join the job, job ∪ GetProcessExtendedInfos, S(t) = job members plus the PIDs GetProcessExtendedInfos reports for the product's WebView2 environment (Ferrum, cfg-tauri-baseline); never selected by executable name. Crashpad handled symmetrically (included for all products or excluded for all; choice recorded)."
tool: "QueryInformationJobObject (JobObjectExtendedLimitInformation); GetProcessMemoryInfo sampler"
normalization: MiB
support: unverified
phase: phase-p5-telemetry
tags:
  - research
  - metric
unverified:
  - claim: "msedgewebview2.exe processes of Ferrum/baseline join the harness Job Object (measurement note §2.2 UNCERTAIN)"
    verify_in: phase-p6-benchmark-harness
  - claim: "PeakJobMemoryUsed is commit-based (the same quantity as summed PrivateUsage)"
    verify_in: phase-p5-telemetry
---

# Peak tree private commit

| Field | Value |
|---|---|
| Unit | bytes |
| Support | `unverified`. Nothing has been measured yet |
| Validated in | `phase-p5-telemetry` |

**Definition.** Maximum over the window of the summed tree private commit; preferred source is the Job Object PeakJobMemoryUsed when job membership is complete (otherwise the sampled maximum), cross-checked against the maximum of the 1 s sampled sum.

**Boundaries.** Start: Job creation (target launched suspended into the job). End: End of the workload measurement window.

**Method.** Read JOBOBJECT_EXTENDED_LIMIT_INFORMATION.PeakJobMemoryUsed at window end; also max_t of the sampled sum. Never the sum of per-process peaks. Process set S(t) follows the product's pre-registered attribution mode (ov-research-fairness-protocol rule 3): job-only, S(t) = every process in the harness-owned Job Object the target was launched into (suspended, fresh profile / user data folder); or, if msedgewebview2.exe processes do not join the job, job ∪ GetProcessExtendedInfos, S(t) = job members plus the PIDs GetProcessExtendedInfos reports for the product's WebView2 environment (Ferrum, cfg-tauri-baseline); never selected by executable name. Crashpad handled symmetrically (included for all products or excluded for all; choice recorded).

**Attribution caveat.** Whether the WebView2 processes of Ferrum and the baseline join the host's Job Object is UNCERTAIN in the [measurement note](../../raw/research/measurement-methodology.md) §2.2 and is UNVERIFIED[phase-p6-benchmark-harness] (first checked in the P1 de-risking spike). The attribution mode per product is fixed from that check and pre-registered before comparative data exists; it is never chosen after seeing data. `PeakJobMemoryUsed` is valid only when job membership is complete (job-only mode). Otherwise the peak is the maximum of the sampled sum over S(t), and the same source is used for every product in the comparison.

**Tool.** QueryInformationJobObject (JobObjectExtendedLimitInformation); GetProcessMemoryInfo sampler

**Normalisation.** MiB

## Notes
- The job tracks its peak continuously, so short spikes between samples are not missed ([measurement note](../../raw/research/measurement-methodology.md) §1.2, VERIFIED).
- Whether PeakJobMemoryUsed is exactly commit-based is UNVERIFIED[phase-p5-telemetry]. To check, compare it with the sampled maximum of the summed PrivateUsage.
- A job-wide peak counts from job creation, which includes startup. A window-only peak therefore uses the sampled maximum, and the report states which of the two was used.

## Used by
Experiments and hypotheses that reference this metric are listed in [ov-research-traceability](../ov-research-traceability.md).
