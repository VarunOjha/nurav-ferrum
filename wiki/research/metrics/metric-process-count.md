---
id: metric-process-count
type: metric
title: "Attributed process count"
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
unit: count
definition: "Number of processes in S(t), broken down by process kind (browser, renderer, GPU, utility, crashpad, host app)."
boundary_start: "n/a (point sample)"
boundary_end: "n/a (point sample)"
method: "Enumerate the attributed set S(t) (job members, plus GetProcessExtendedInfos PIDs if the pre-registered mode is job ∪ GetProcessExtendedInfos) at each memory sample; classify by WebView2 ProcessExtendedInfo kind (Ferrum/baseline) or by Chromium --type= command-line argument (Chrome/Edge)."
tool: "QueryInformationJobObject (JobObjectBasicProcessIdList); GetProcessExtendedInfos; command-line inspection"
normalization: none
support: unverified
phase: phase-p5-telemetry
tags:
  - research
  - metric
unverified:
  - claim: "msedgewebview2.exe processes of Ferrum/baseline join the harness Job Object (measurement note §2.2 UNCERTAIN)"
    verify_in: phase-p6-benchmark-harness
  - claim: "Chrome and Edge child processes can be classified reliably by their --type= command-line argument"
    verify_in: phase-p6-benchmark-harness
  - claim: "Chrome and Edge child processes do not break away from the harness job"
    verify_in: phase-p6-benchmark-harness
---

# Attributed process count

| Field | Value |
|---|---|
| Unit | count |
| Support | `unverified`. Nothing has been measured yet |
| Validated in | `phase-p5-telemetry` |

**Definition.** Number of processes in S(t), broken down by process kind (browser, renderer, GPU, utility, crashpad, host app).

**Boundaries.** Start: n/a (point sample). End: n/a (point sample).

**Method.** Enumerate the attributed set S(t) (job members, plus GetProcessExtendedInfos PIDs if the pre-registered mode is job ∪ GetProcessExtendedInfos) at each memory sample; classify by WebView2 ProcessExtendedInfo kind (Ferrum/baseline) or by Chromium --type= command-line argument (Chrome/Edge).

**Attribution caveat.** Whether the WebView2 processes of Ferrum and the baseline join the host's Job Object is UNCERTAIN in the [measurement note](../../raw/research/measurement-methodology.md) §2.2 and is UNVERIFIED[phase-p6-benchmark-harness] (first checked in the P1 de-risking spike). The attribution mode per product is fixed from that check and pre-registered before comparative data exists; it is never chosen after seeing data. Process count enumerates S(t), not only job members.

**Tool.** QueryInformationJobObject (JobObjectBasicProcessIdList); GetProcessExtendedInfos; command-line inspection

**Normalisation.** none

## Notes
- This is a diagnostic metric for [rq-01](../questions/rq-01-resource-footprint.md) and [rq-06](../questions/rq-06-isolation.md). It explains memory differences (spare renderer, soft process limit) and is not a quality metric in itself ([measurement note](../../raw/research/measurement-methodology.md) §2.1, VERIFIED).
- Classifying Chrome and Edge child processes by their `--type=` argument is UNVERIFIED[phase-p6-benchmark-harness].
- Whether Chrome or Edge child processes break away from the harness job is UNVERIFIED[phase-p6-benchmark-harness]. If any process outside the job appears in the browser's own process list, the trial fails (measurement note §2.3).

## Used by
Experiments and hypotheses that reference this metric are listed in [ov-research-traceability](../ov-research-traceability.md).
