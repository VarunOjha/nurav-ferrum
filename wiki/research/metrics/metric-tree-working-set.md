---
id: metric-tree-working-set
type: metric
title: "Tree working set (secondary, over-counts shared pages)"
status: proposed
updated: 2026-10-18
sources:
  - raw/evidence/phase-p5-telemetry/check-p5.4.txt
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
definition: "Sum of WorkingSetSize over S(t). Includes shareable pages, so pages shared by k processes are counted k times."
boundary_start: "Start of the workload measurement window (harness QPC)"
boundary_end: "End of the workload measurement window (harness QPC)"
method: "Same sampler as metric-tree-private-commit. Reported only together with the over-counting caveat; never a headline. Process set S(t) follows the product's pre-registered attribution mode (ov-research-fairness-protocol rule 3): job-only, S(t) = every process in the harness-owned Job Object the target was launched into (suspended, fresh profile / user data folder); or, if msedgewebview2.exe processes do not join the job, job ∪ GetProcessExtendedInfos, S(t) = job members plus the PIDs GetProcessExtendedInfos reports for the product's WebView2 environment (Ferrum, cfg-tauri-baseline); never selected by executable name. Crashpad handled symmetrically (included for all products or excluded for all; choice recorded)."
tool: "GetProcessMemoryInfo (WorkingSetSize)"
normalization: "MiB; no ratio-based claims"
support: unverified
phase: phase-p5-telemetry
tags:
  - research
  - metric
unverified:
  - claim: "msedgewebview2.exe processes of Ferrum/baseline join the harness Job Object (measurement note §2.2 UNCERTAIN)"
    verify_in: phase-p6-benchmark-harness
---

# Tree working set (secondary, over-counts shared pages)

| Field | Value |
|---|---|
| Unit | bytes |
| Support | `unverified`. Nothing has been measured yet |
| Validated in | `phase-p5-telemetry` |

**Definition.** Sum of WorkingSetSize over S(t). Includes shareable pages, so pages shared by k processes are counted k times.

**Boundaries.** Start: Start of the workload measurement window (harness QPC). End: End of the workload measurement window (harness QPC).

**Method.** Same sampler as metric-tree-private-commit. Reported only together with the over-counting caveat; never a headline. Process set S(t) follows the product's pre-registered attribution mode (ov-research-fairness-protocol rule 3): job-only, S(t) = every process in the harness-owned Job Object the target was launched into (suspended, fresh profile / user data folder); or, if msedgewebview2.exe processes do not join the job, job ∪ GetProcessExtendedInfos, S(t) = job members plus the PIDs GetProcessExtendedInfos reports for the product's WebView2 environment (Ferrum, cfg-tauri-baseline); never selected by executable name. Crashpad handled symmetrically (included for all products or excluded for all; choice recorded).

**Attribution caveat.** Whether the WebView2 processes of Ferrum and the baseline join the host's Job Object is UNCERTAIN in the [measurement note](../../raw/research/measurement-methodology.md) §2.2 and is UNVERIFIED[phase-p6-benchmark-harness] (first checked in the P1 de-risking spike). The attribution mode per product is fixed from that check and pre-registered before comparative data exists; it is never chosen after seeing data.

**Tool.** GetProcessMemoryInfo (WorkingSetSize)

**Normalisation.** MiB; no ratio-based claims

## Why it is still collected
Master prompt §7 asks for working set and for private memory to be distinguished from shared physical pages ([raw/00-master-prompt.md](../../raw/00-master-prompt.md)). Adding up working sets double-counts shared DLL and image pages ([measurement note](../../raw/research/measurement-methodology.md) §1.1, VERIFIED). Edge and Evergreen WebView2 binaries can also be hard-linked when their versions match, which means even more shared image pages (§6.2, VERIFIED). This metric is shown only to explain the gap between it and the private metrics.

Do not use `sysinfo::Process::memory()`: on Windows it returns WorkingSetSize (§8, VERIFIED).

## Ground-truth validation (p5.4)

[check-p5.4](../../raw/evidence/phase-p5-telemetry/check-p5.4.txt), values in [ground-truth-p5.4.json](../../raw/evidence/phase-p5-telemetry/ground-truth-p5.4.json); limits in [ground-truth-tolerances.json](../../../crates/telemetry/tests/ground-truth-tolerances.json), committed before the first run (d36d27c). The helper allocates 256 MiB and writes every byte: limit, a rise of 243.2 to 260 MiB; result 256.0 MiB. Every touched 4 KiB page cost 1.0 page faults (limit at least 0.9). psutil `rss` was within 256 KiB (limit) of `WorkingSetSize`: 0 KiB at three points, as was the page-fault count. This characterises the meter, not Ferrum.

## Used by
Experiments and hypotheses that reference this metric are listed in [ov-research-traceability](../ov-research-traceability.md).
