---
id: risk-r04
type: risk
title: "AMD energy counters may be modeled (Zen 2 evidence), CPU-package only, and need admin rights plus a kernel driver"
status: open
updated: 2026-10-08
sources:
  - raw/research/measurement-methodology.md
  - raw/research/related-work-seed.md
  - raw/01-scoping-decisions.md
  - raw/research/tauri-webview2-capabilities.md
related: [phase-p6-benchmark-harness, phase-p5-telemetry, adr-0009, comp-benchmark-harness, comp-telemetry, exp-energy, exp-lifecycle-policies, risk-r14, risk-r21]
approvable: true
tags: [energy, amd, measurement, privileges]
likelihood: 5
impact: 4
mitigation: "Label any counter reading as 'modeled CPU-package energy (excludes DRAM; not wall energy)'; require a wall-power meter for any system-energy claim; never install WinRing0; install PawnIO only after owner approval; run the sampler as a separate elevated process; read or integrate the energy counter with wrap handling; mark the dimension unsupported if it cannot be defended."
spike: p6.9
owner_phase: phase-p6-benchmark-harness
trigger: "Owner declines the driver or has no wall meter; the package sensor is not exposed for the owner's CPU generation; readings are flat, implausible against idle, or wrap without being detected."
fallback: "Set exp-energy metrics to support unsupported with the documented reason; report CPU time and cycles only, explicitly not as energy."
unverified:
  - claim: "Zen 2 findings (modeled, no DRAM, under-reporting) apply to the owner's desktop Ryzen generation"
    verify_in: phase-p6-benchmark-harness
  - claim: "Reading the AMD package energy MSR via PawnIO requires administrator rights on this machine"
    verify_in: phase-p6-benchmark-harness
  - claim: "Windows E3/SRUM still requires a battery in 2026 (powercfg /srumutil fails or returns no energy data on this desktop)"
    verify_in: phase-p6-benchmark-harness
---

# risk-r04: AMD energy counters may be modeled (Zen 2 evidence), CPU-package only, and need admin rights plus a kernel driver

| Likelihood | Impact | Score | Status | Owner phase |
|---|---|---|---|---|
| 5 | 4 | 20 | open | `phase-p6-benchmark-harness` |

Score = likelihood × impact (SCHEMA §6.5). Scales are planning judgements, not measurements. Full register: [ov-risk-register](ov-risk-register.md).

## Description and evidence

The owner chose this AMD desktop for benchmarks, with energy via AMD RAPL-equivalent counters through LibreHardwareMonitor where supported, else unsupported (adr-0009, Q6). The research makes the original risk worse (MM §5, RW E4):

- Schöne et al. (IEEE CLUSTER 2021, Zen 2 EPYC 7502 server chip) found AMD's energy data is **modeled, not measured**, has **no DRAM domain**, and the package domain **reports much lower power than an external meter**. Whether this holds for the owner's desktop chip (generation unknown, Q-116) is UNVERIFIED[phase-p6-benchmark-harness].
- LibreHardwareMonitor v0.9.5 switched from WinRing0 to the signed **PawnIO** driver. It publishes package **power in watts** averaged over its polling interval, not cumulative energy, so the harness must integrate it or read the MSR energy counter directly. The 32-bit counter wraps.
- WinRing0 is flagged by Microsoft Defender (secondary sources only, labelled UNCERTAIN in MM §5.2).
- Windows E3/SRUM energy estimates need a battery, so they do not work on this desktop (Microsoft DevBlogs 2020; whether this still holds in 2026 is open).
- `RAPL in Action` (Khan et al. 2018) studies **Intel** RAPL only and must not be cited as support for AMD counters (RW E1).
- WebView2 browser flags set through environment variables are ignored when the app runs elevated (TW §7), so an admin-only sampler must be a **separate process** from the Ferrum under test.

Owner questions raised by MM §10: exact Ryzen model and RAM; wall-power meter availability; approval to install PawnIO and run elevated.

Sources: [measurement-methodology](../raw/research/measurement-methodology.md), [related-work-seed](../raw/research/related-work-seed.md), [scoping decisions](../raw/01-scoping-decisions.md), [tauri-webview2-capabilities](../raw/research/tauri-webview2-capabilities.md). Abbreviations: TW = tauri-webview2-capabilities, MM = measurement-methodology, RW = related-work-seed, NX = nextjs-stack, LW = llm-wiki-pattern.

## Early-warning signs (trigger)

Owner declines the driver or has no wall meter; the package sensor is not exposed for the owner's CPU generation; readings are flat, implausible against idle, or wrap without being detected.

## Mitigation

Label any counter reading as 'modeled CPU-package energy (excludes DRAM; not wall energy)'; require a wall-power meter for any system-energy claim; never install WinRing0; install PawnIO only after owner approval; run the sampler as a separate elevated process; read or integrate the energy counter with wrap handling; mark the dimension unsupported if it cannot be defended.

## De-risking spike (proposed)

Phase: `phase-p6-benchmark-harness` (early task, before any energy experiment is preregistered).
1. With owner approval, install PawnIO (or LHM ≥ 0.9.5) and read the power unit and package energy counter; record the energy unit and compute the wrap period from it.
2. Run `powercfg /srumutil` and record the output to confirm or refute E3 availability.
3. Compare idle vs a fixed CPU-burner fixture for plausibility only (no claims).
4. If a wall meter exists, log it alongside the counter for the same fixtures.
5. Decide `support` for each energy metric and record the evidence.

Assigned by the integration pass (2026-10-08): task `p6.9`, phase-p6-benchmark-harness energy sampler; the CPU model and RAM are recorded earlier in p1.2.

## Fallback if realised

Set exp-energy metrics to support unsupported with the documented reason; report CPU time and cycles only, explicitly not as energy.

## Unverified claims

- Zen 2 findings (modeled, no DRAM, under-reporting) apply to the owner's desktop Ryzen generation. UNVERIFIED[phase-p6-benchmark-harness]
- Reading the AMD package energy MSR via PawnIO requires administrator rights on this machine. UNVERIFIED[phase-p6-benchmark-harness]
- Windows E3/SRUM still requires a battery in 2026 (powercfg /srumutil fails or returns no energy data on this desktop). UNVERIFIED[phase-p6-benchmark-harness]

## Affects

`phase-p6-benchmark-harness`, `phase-p5-telemetry`, `adr-0009`, `comp-benchmark-harness`, `comp-telemetry`, `exp-energy`, `exp-lifecycle-policies`, `risk-r14`, `risk-r21`
