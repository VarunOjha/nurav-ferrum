---
id: metric-tree-private-commit
type: metric
title: "Tree private commit (headline memory metric)"
status: defined
updated: 2026-10-19
sources:
  - raw/research/literature-batch-5.md
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
definition: "Sum of PrivateUsage (private commit charge) over the attributed process set S(t) at sample time t; per trial summarised as the time-average over the measurement window plus values at named checkpoints."
boundary_start: "Start of the workload's measurement window (after its settle period), as logged by the harness on its QPC clock"
boundary_end: "End of the workload's measurement window (harness QPC timestamp)"
method: "Sample every 1 s (proposed). Process set S(t) follows the product's pre-registered attribution mode (ov-research-fairness-protocol rule 3): job-only, S(t) = every process in the harness-owned Job Object the target was launched into (suspended, fresh profile / user data folder); or, if msedgewebview2.exe processes do not join the job, job ∪ GetProcessExtendedInfos, S(t) = job members plus the PIDs GetProcessExtendedInfos reports for the product's WebView2 environment (Ferrum, cfg-tauri-baseline); never selected by executable name. Crashpad handled symmetrically (included for all products or excluded for all; choice recorded). Checkpoint variants (named in the experiment): idle, after-tab-create, after-tab-close, after-restore, after-N-navigations, under-memory-pressure."
tool: "Win32 GetProcessMemoryInfo with PROCESS_MEMORY_COUNTERS_EX2 via the windows crate from the Rust orchestrator; Job Object enumeration"
normalization: "Reported in MiB. For J (objective function) divided by the same-block value of the reference configuration cfg-ferrum-nolifecycle."
support: unverified
phase: phase-p5-telemetry
tags:
  - research
  - metric
unverified:
  - claim: "msedgewebview2.exe processes of Ferrum/baseline join the harness Job Object (measurement note §2.2 UNCERTAIN)"
    verify_in: phase-p6-benchmark-harness
---

# Tree private commit (headline memory metric)

| Field | Value |
|---|---|
| Unit | bytes |
| Support | `unverified`. Definition final (p5.13). The in-app meter passed its ground-truth check on this PC ([check-p5.4](../../raw/evidence/phase-p5-telemetry/check-p5.4.txt)); the A/A run and the job-wide comparison below come with the harness (P6) |
| Validated in | `phase-p5-telemetry` |

**Definition.** Sum of PrivateUsage (private commit charge) over the attributed process set S(t) at sample time t; per trial summarised as the time-average over the measurement window plus values at named checkpoints.

**Boundaries.** Start: Start of the workload's measurement window (after its settle period), as logged by the harness on its QPC clock. End: End of the workload's measurement window (harness QPC timestamp).

**Method.** Sample every 1 s (proposed). Process set S(t) follows the product's pre-registered attribution mode (ov-research-fairness-protocol rule 3): job-only, S(t) = every process in the harness-owned Job Object the target was launched into (suspended, fresh profile / user data folder); or, if msedgewebview2.exe processes do not join the job, job ∪ GetProcessExtendedInfos, S(t) = job members plus the PIDs GetProcessExtendedInfos reports for the product's WebView2 environment (Ferrum, cfg-tauri-baseline); never selected by executable name. Crashpad handled symmetrically (included for all products or excluded for all; choice recorded). Checkpoint variants (named in the experiment): idle, after-tab-create, after-tab-close, after-restore, after-N-navigations, under-memory-pressure.

**Attribution caveat.** Whether the WebView2 processes of Ferrum and the baseline join the host's Job Object is UNCERTAIN in the [measurement note](../../raw/research/measurement-methodology.md) §2.2 and is UNVERIFIED[phase-p6-benchmark-harness] (first checked in the P1 de-risking spike). The attribution mode per product is fixed from that check and pre-registered before comparative data exists; it is never chosen after seeing data.

**Tool.** Win32 GetProcessMemoryInfo with PROCESS_MEMORY_COUNTERS_EX2 via the windows crate from the Rust orchestrator; Job Object enumeration

**Normalisation.** Reported in MiB. For J (objective function) divided by the same-block value of the reference configuration cfg-ferrum-nolifecycle.

## Why this is the headline metric
Private commit is private by definition, so per-process values can be added up without double counting shared pages ([measurement note](../../raw/research/measurement-methodology.md) §1.1, VERIFIED). Trimming the working set does not change it (§1.1).

## Pitfalls
- Never compute a "peak" by adding per-process peaks; see [metric-peak-tree-private-commit](metric-peak-tree-private-commit.md).
- WebView2 renderers can serve several WebViews on the same user data folder, so **per-tab** private commit is not well-defined. Per-tab figures, if shown at all, are labelled "renderer(s) hosting this tab's frames" and never added up (§2.2, VERIFIED).
- Chromium's process limit depends on installed RAM, so total RAM is recorded with every trial (§2.1, VERIFIED).
- Availability of the EX2 struct on the benchmark machine: the docs say Windows 11 22H2 with the September 2023 update or later, and the observed OS build is 10.0.26200 ([raw/01-scoping-decisions.md](../../raw/01-scoping-decisions.md)). The call works on this PC: Windows fills the EX2 fields ([check-p5.3](../../raw/evidence/phase-p5-telemetry/check-p5.3.txt)).

## Validation (before support becomes `supported`)
1. A/A run: the same configuration as two arms shows no practically relevant difference.
2. Synthetic allocation probe: a fixture page that allocates a known amount of JS heap. The tree private commit increases by at least that amount. Done in p5.4 (below).
3. In job-only mode, compare the job-wide peak with the sampled maximum (see [metric-peak-tree-private-commit](metric-peak-tree-private-commit.md)).

## Ground-truth validation (p5.4)

Checked against amounts known in advance; [check-p5.4](../../raw/evidence/phase-p5-telemetry/check-p5.4.txt), values in [ground-truth-p5.4.json](../../raw/evidence/phase-p5-telemetry/ground-truth-p5.4.json); limits in [ground-truth-tolerances.json](../../../crates/telemetry/tests/ground-truth-tolerances.json), committed before the first run (d36d27c).

| Probe | Limit | Result |
|---|---|---|
| Helper allocates 256 MiB and writes every byte | rise 255.5 to 260 MiB | 256.5 MiB |
| Helper frees it | at most 4 MiB above the start | 0.0 MiB |
| Ferrum tab fills a 128 MiB JavaScript buffer (median of 3 readings before and after) | tree rise 121.6 to 192 MiB | 130.3 MiB (first run: 129.5) |
| psutil `memory_info().private`, helper idle | within 64 KiB | 0 KiB at three points |

Both runs passed (the first run's raw output was not saved, only its summary line in the log). These results characterise the meter, not Ferrum. Steps 1 and 3 of the validation list are not done yet.

## Used by
Experiments and hypotheses that reference this metric are listed in [ov-research-traceability](../ov-research-traceability.md).
