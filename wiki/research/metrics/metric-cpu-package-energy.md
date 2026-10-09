---
id: metric-cpu-package-energy
type: metric
title: "Modeled CPU-package energy (AMD)"
status: proposed
updated: 2026-10-08
sources:
  - raw/research/measurement-methodology.md
  - raw/00-master-prompt.md
  - raw/research/related-work-seed.md
related:
  - ov-research-plan
  - ov-research-traceability
  - comp-telemetry
  - comp-benchmark-harness
approvable: true
unit: J
definition: "Energy reported by the AMD package energy counter over the window (difference of MSR_PKG_ENERGY_STAT scaled by the energy unit from MSR_PWR_UNIT), handling 32-bit wrap; labelled 'modeled CPU-package energy; excludes DRAM; not wall energy'."
boundary_start: "Window start (sampler timestamp)"
boundary_end: "Window end (sampler timestamp)"
method: "Separate elevated sampler process reads the counter directly (preferred) or integrates LibreHardwareMonitor package power over time; poll interval chosen so the counter cannot wrap twice between reads. Whole-package, not per process: requires the system to be otherwise idle and comparison against the same session's idle baseline."
tool: "PawnIO signed driver (directly or via LibreHardwareMonitor >= 0.9.5); never WinRing0"
normalization: "J per completed workload, minus idle-baseline energy for the same duration; ratio to reference configuration for J"
support: unverified
phase: phase-p6-benchmark-harness
tags:
  - research
  - metric
unverified:
  - claim: "Zen 2 findings (modeled, no DRAM, under-reporting) hold for the owner's Ryzen generation"
    verify_in: phase-p6-benchmark-harness
  - claim: "Windows E3/SRUM energy estimates still require a battery in 2026"
    verify_in: phase-p6-benchmark-harness
---

# Modeled CPU-package energy (AMD)

| Field | Value |
|---|---|
| Unit | J |
| Support | `unverified`. Nothing has been measured yet |
| Validated in | `phase-p6-benchmark-harness` |

**Definition.** Energy reported by the AMD package energy counter over the window (difference of MSR_PKG_ENERGY_STAT scaled by the energy unit from MSR_PWR_UNIT), handling 32-bit wrap; labelled 'modeled CPU-package energy; excludes DRAM; not wall energy'.

**Boundaries.** Start: Window start (sampler timestamp). End: Window end (sampler timestamp).

**Method.** Separate elevated sampler process reads the counter directly (preferred) or integrates LibreHardwareMonitor package power over time; poll interval chosen so the counter cannot wrap twice between reads. Whole-package, not per process: requires the system to be otherwise idle and comparison against the same session's idle baseline.

**Tool.** PawnIO signed driver (directly or via LibreHardwareMonitor >= 0.9.5); never WinRing0

**Normalisation.** J per completed workload, minus idle-baseline energy for the same duration; ratio to reference configuration for J

## Support status: unverified, and it may become `unsupported`
- AMD energy counters were studied on Zen 2: the data is modeled, not measured; there is no DRAM domain; the package domain reports significantly lower power than an external measurement ([related-work seed](../../raw/research/related-work-seed.md) E4, full text VERIFIED). Whether this also holds for the owner's desktop Ryzen (generation unknown) is UNVERIFIED[phase-p6-benchmark-harness].
- LibreHardwareMonitor exposes package **power** (W) computed from MSR deltas, not cumulative energy ([measurement note](../../raw/research/measurement-methodology.md) §5.1, VERIFIED source read). Integrating it adds sampling error.
- Installing the PawnIO driver and running an elevated sampler needs owner approval (`adr-0009`, `risk-r04`).
- Windows E3/SRUM needs a battery, so it is unsuitable on this desktop (§5.3, VERIFIED, 2020 source). It has not been re-checked for 2026: UNVERIFIED[phase-p6-benchmark-harness].

## Validation gate (pre-registered)
The metric becomes `supported` only when all of these hold:
1. The counter is readable and its unit and wrap period are known.
2. An A/A run gives a noise floor.
3. A load-step test (idle, then fixed CPU load levels) yields monotonically increasing energy.
4. If a wall meter exists, readings correlate with [metric-wall-energy](metric-wall-energy.md) across the load steps. The required correlation is set before the test.

If the gate fails, the support status becomes **`unsupported`** and no energy values are estimated (master prompt §7: [raw/00-master-prompt.md](../../raw/00-master-prompt.md)).

## Used by
Experiments and hypotheses that reference this metric are listed in [ov-research-traceability](../ov-research-traceability.md).
