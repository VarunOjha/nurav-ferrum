---
id: metric-tree-private-working-set
type: metric
title: "Tree private working set"
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
definition: "Sum of PrivateWorkingSetSize (resident private pages) over the attributed process set S(t); time-averaged over the window."
boundary_start: "Start of the workload measurement window (harness QPC)"
boundary_end: "End of the workload measurement window (harness QPC)"
method: "Same sampler, attribution and checkpoints as metric-tree-private-commit. Process set S(t) follows the product's pre-registered attribution mode (ov-research-fairness-protocol rule 3): job-only, S(t) = every process in the harness-owned Job Object the target was launched into (suspended, fresh profile / user data folder); or, if msedgewebview2.exe processes do not join the job, job ∪ GetProcessExtendedInfos, S(t) = job members plus the PIDs GetProcessExtendedInfos reports for the product's WebView2 environment (Ferrum, cfg-tauri-baseline); never selected by executable name. Crashpad handled symmetrically (included for all products or excluded for all; choice recorded)."
tool: "GetProcessMemoryInfo with PROCESS_MEMORY_COUNTERS_EX2 (PrivateWorkingSetSize, EX2 only)"
normalization: "MiB; ratio to reference configuration where compared"
support: unverified
phase: phase-p5-telemetry
tags:
  - research
  - metric
unverified:
  - claim: "msedgewebview2.exe processes of Ferrum/baseline join the harness Job Object (measurement note §2.2 UNCERTAIN)"
    verify_in: phase-p6-benchmark-harness
---

# Tree private working set

| Field | Value |
|---|---|
| Unit | bytes |
| Support | `unverified`. Nothing has been measured yet |
| Validated in | `phase-p5-telemetry` |

**Definition.** Sum of PrivateWorkingSetSize (resident private pages) over the attributed process set S(t); time-averaged over the window.

**Boundaries.** Start: Start of the workload measurement window (harness QPC). End: End of the workload measurement window (harness QPC).

**Method.** Same sampler, attribution and checkpoints as metric-tree-private-commit. Process set S(t) follows the product's pre-registered attribution mode (ov-research-fairness-protocol rule 3): job-only, S(t) = every process in the harness-owned Job Object the target was launched into (suspended, fresh profile / user data folder); or, if msedgewebview2.exe processes do not join the job, job ∪ GetProcessExtendedInfos, S(t) = job members plus the PIDs GetProcessExtendedInfos reports for the product's WebView2 environment (Ferrum, cfg-tauri-baseline); never selected by executable name. Crashpad handled symmetrically (included for all products or excluded for all; choice recorded).

**Attribution caveat.** Whether the WebView2 processes of Ferrum and the baseline join the host's Job Object is UNCERTAIN in the [measurement note](../../raw/research/measurement-methodology.md) §2.2 and is UNVERIFIED[phase-p6-benchmark-harness] (first checked in the P1 de-risking spike). The attribution mode per product is fixed from that check and pre-registered before comparative data exists; it is never chosen after seeing data.

**Tool.** GetProcessMemoryInfo with PROCESS_MEMORY_COUNTERS_EX2 (PrivateWorkingSetSize, EX2 only)

**Normalisation.** MiB; ratio to reference configuration where compared

## Notes
- This metric can be added up across processes. It is the closest thing to "unique resident memory" ([measurement note](../../raw/research/measurement-methodology.md) §1.2, DERIVED from VERIFIED API semantics).
- It is sensitive to working-set trimming and to system memory pressure (§1.1, VERIFIED). It is reported as a secondary metric next to [metric-tree-private-commit](metric-tree-private-commit.md).
- EX2 is available on this PC and its `PrivateWorkingSetSize` is filled ([check-p5.3](../../raw/evidence/phase-p5-telemetry/check-p5.3.txt)).

## Ground-truth validation (p5.4)

[check-p5.4](../../raw/evidence/phase-p5-telemetry/check-p5.4.txt), values in [ground-truth-p5.4.json](../../raw/evidence/phase-p5-telemetry/ground-truth-p5.4.json); limits in [ground-truth-tolerances.json](../../../crates/telemetry/tests/ground-truth-tolerances.json), committed before the first run (d36d27c). The helper allocates 256 MiB and writes every byte: limit, a rise of 243.2 to 260 MiB (Windows may trim a few pages); result 256.0 MiB. psutil's `uss`, counted another way, was within 2 MiB (limit) of `PrivateWorkingSetSize`: 0.03 MiB at three points. This characterises the meter, not Ferrum.

## Used by
Experiments and hypotheses that reference this metric are listed in [ov-research-traceability](../ov-research-traceability.md).
