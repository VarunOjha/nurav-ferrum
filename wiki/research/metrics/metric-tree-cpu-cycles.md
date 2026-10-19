---
id: metric-tree-cpu-cycles
type: metric
title: "Tree CPU cycles (frequency-sensitive)"
status: proposed
updated: 2026-10-19
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
unit: cycles
definition: "Sum over S of QueryProcessCycleTime deltas across the window (user + kernel cycles)."
boundary_start: "Start of measurement window"
boundary_end: "End of measurement window"
method: "Per-process cycle counts sampled at window start/end and at process exit where observable; summed. Not converted to seconds (cycles depend on boost / P-states). Process set S(t) follows the product's pre-registered attribution mode (ov-research-fairness-protocol rule 3): job-only, S(t) = every process in the harness-owned Job Object the target was launched into (suspended, fresh profile / user data folder); or, if msedgewebview2.exe processes do not join the job, job ∪ GetProcessExtendedInfos, S(t) = job members plus the PIDs GetProcessExtendedInfos reports for the product's WebView2 environment (Ferrum, cfg-tauri-baseline); never selected by executable name. Crashpad handled symmetrically (included for all products or excluded for all; choice recorded)."
tool: "QueryProcessCycleTime (windows crate)"
normalization: "Per completed workload; reported separately from CPU time"
support: unverified
phase: phase-p5-telemetry
tags:
  - research
  - metric
unverified:
  - claim: "msedgewebview2.exe processes of Ferrum/baseline join the harness Job Object (measurement note §2.2 UNCERTAIN)"
    verify_in: phase-p6-benchmark-harness
  - claim: "Cycle counts of processes that exit inside the window are captured"
    verify_in: phase-p6-benchmark-harness
---

# Tree CPU cycles (frequency-sensitive)

| Field | Value |
|---|---|
| Unit | cycles |
| Support | `unverified`. Nothing has been measured yet |
| Validated in | `phase-p5-telemetry` |

**Definition.** Sum over S of QueryProcessCycleTime deltas across the window (user + kernel cycles).

**Boundaries.** Start: Start of measurement window. End: End of measurement window.

**Method.** Per-process cycle counts sampled at window start/end and at process exit where observable; summed. Not converted to seconds (cycles depend on boost / P-states). Process set S(t) follows the product's pre-registered attribution mode (ov-research-fairness-protocol rule 3): job-only, S(t) = every process in the harness-owned Job Object the target was launched into (suspended, fresh profile / user data folder); or, if msedgewebview2.exe processes do not join the job, job ∪ GetProcessExtendedInfos, S(t) = job members plus the PIDs GetProcessExtendedInfos reports for the product's WebView2 environment (Ferrum, cfg-tauri-baseline); never selected by executable name. Crashpad handled symmetrically (included for all products or excluded for all; choice recorded).

**Attribution caveat.** Whether the WebView2 processes of Ferrum and the baseline join the host's Job Object is UNCERTAIN in the [measurement note](../../raw/research/measurement-methodology.md) §2.2 and is UNVERIFIED[phase-p6-benchmark-harness] (first checked in the P1 de-risking spike). The attribution mode per product is fixed from that check and pre-registered before comparative data exists; it is never chosen after seeing data. Cycle counts are summed over S(t) in either mode.

**Tool.** QueryProcessCycleTime (windows crate)

**Normalisation.** Per completed workload; reported separately from CPU time

## Notes
- The docs give no way to convert cycles to time ([measurement note](../../raw/research/measurement-methodology.md) §3, VERIFIED). Reporting cycles as seconds would be invalid (DERIVED).
- Processes that exit within the window lose their counters unless they are sampled first. Coverage of short-lived processes is UNVERIFIED[phase-p6-benchmark-harness] (re-targeted in P5: the in-app sampler keeps an ended process's last reading (p5.3), but what it used after that reading is lost; the harness's Job Object accounting, which keeps ended processes, is P6). [metric-tree-cpu-time](metric-tree-cpu-time.md) remains the primary CPU metric.

## Ground-truth validation (p5.4)

[check-p5.4](../../raw/evidence/phase-p5-telemetry/check-p5.4.txt), values in [ground-truth-p5.4.json](../../raw/evidence/phase-p5-telemetry/ground-truth-p5.4.json); limits in [ground-truth-tolerances.json](../../../crates/telemetry/tests/ground-truth-tolerances.json), committed before the first run (d36d27c). Cycles cannot be turned into time (above), so the check is only that they are plausible: over the helper's 2 s busy loop, cycles divided by CPU seconds gave 3.18 billion per second, inside the limit of 0.4 to 6.5 billion. Since p5.3 the sampler keeps the last cycle reading of a process that ends, so a short-lived process is counted up to its last sample; whether that is enough is still the open question above. This characterises the meter, not Ferrum.

## Used by
Experiments and hypotheses that reference this metric are listed in [ov-research-traceability](../ov-research-traceability.md).
