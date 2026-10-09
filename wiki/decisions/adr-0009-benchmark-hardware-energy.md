---
id: adr-0009
type: decision
title: "Benchmark hardware is the owner's AMD desktop; energy via AMD package counters where supported, else marked unsupported"
status: accepted
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/research/measurement-methodology.md
  - raw/research/related-work-seed.md
  - raw/research/tauri-webview2-capabilities.md
related: [adr-0012, adr-0013, adr-0005, adr-0021, risk-r04, risk-r05, phase-p6-benchmark-harness, phase-p7-lifecycle, phase-p8-research-paper, exp-energy, exp-baseline-footprint, comp-benchmark-harness, comp-research-analysis]
approvable: true
date: 2026-10-08
decided_by: owner
supersedes: []
options:
  - "This AMD desktop, energy via AMD RAPL-equivalent counters through LibreHardwareMonitor"
  - "This AMD desktop with an external wall-power meter as the energy reference"
  - "A separate Intel machine (Intel RAPL) or a laptop (Windows E3/SRUM)"
  - "Mark energy unsupported entirely"
phase: phase-p0-planning
tags: [benchmark, hardware, energy, amd]
unverified:
  - claim: "Zen 2 findings (modeled counters, no DRAM domain, under-reporting vs external meter) apply to the owner's desktop Ryzen"
    verify_in: phase-p6-benchmark-harness
  - claim: "Reading AMD package energy via PawnIO/LibreHardwareMonitor works on this machine and requires administrator rights"
    verify_in: phase-p6-benchmark-harness
  - claim: "powercfg /srumutil (E3) yields no usable energy data on this battery-less desktop"
    verify_in: phase-p6-benchmark-harness
---

# ADR-0009: The benchmark hardware is the owner's AMD desktop; energy is reported only where defensible

## Context

The master prompt asks to investigate idle, active, video, background and per-workload energy. It says: "If hardware or software does not support defensible energy measurement, mark the dimension unsupported rather than inventing estimates" ([raw/00-master-prompt.md](../raw/00-master-prompt.md) §7 "Energy").

Scoping question Q6 asked about benchmark hardware. The owner chose **"This desktop, AMD CPU (energy via AMD RAPL-equivalent counters through LibreHardwareMonitor where supported; else mark unsupported)"** ([raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md)). The exact CPU model (Zen generation) and installed RAM are **not yet recorded**.

> **CONTRADICTION:** research weakens the energy half of the owner's decision. The decision is **not** changed here, but how it is carried out has to be.
>
> - **On Zen 2, counters are modeled, not measured.** Schöne et al. (IEEE CLUSTER 2021, DOI 10.1109/Cluster48925.2021.00087; full text read) report for AMD Zen 2 (EPYC 7502):
>   - "the energy data is modeled, not measured";
>   - "No DRAM domain is available";
>   - the package domain "reports significantly lower power compared to the external measurement";
>   - conclusion: AMD RAPL readings "should be considered inaccurate".
>
>   Sources: [raw/research/related-work-seed.md](../raw/research/related-work-seed.md) E4 and [raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md) §5.1. Whether this applies to the owner's (unknown-generation) desktop Ryzen is UNVERIFIED[phase-p6-benchmark-harness].
> - **LibreHardwareMonitor gives power, not energy.** It reads MSR `0xC001029B` and publishes **package power (W)**, not cumulative energy. The harness must integrate it, which adds error, or read the MSR energy counter directly. Since v0.9.5 it uses the signed **PawnIO** kernel driver instead of WinRing0, which Defender flags as vulnerable (methodology §5.1–§5.2).
> - **Windows E3/SRUM needs a battery,** so it is unusable on this desktop (methodology §5.3, Microsoft DevBlogs 2020). UNVERIFIED[phase-p6-benchmark-harness] whether this still holds in 2026.
> - **"RAPL in Action" does not back AMD counters.** Khan et al. (TOMPECS 2018) studies **Intel** RAPL only and must not be cited as support for AMD counters (related-work E1).
> - **Admin rights complicate harness design.** Reading the counters needs admin rights and a kernel driver (initial `risk-r04`, confirmed). WebView2 **ignores browser flags set by environment variable when the app runs elevated** ([raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md) §7). So the energy sampler must be a **separate elevated process**, and Ferrum and the browsers run non-elevated.
>
> Open questions for the owner: Q-116 (CPU model and RAM), Q-122 (wall-power meter) and Q-123 (approve PawnIO and an elevated sampler) in [ov-open-questions](../overview/ov-open-questions.md).

## Options considered

| Option | Pros | Cons |
|---|---|---|
| A. **This AMD desktop; package counters via PawnIO/LHM; report as "modeled CPU-package energy"** (owner's choice, with the label tightened) | No new hardware. Available on the owner's machine. Relative comparisons across configurations in the same session may still be informative | Modeled, excludes DRAM, under-reports (Zen 2 evidence). Needs a kernel driver and elevation. Supports no system-energy or per-process energy claims |
| B. A plus an **external wall-power logging meter** as the system-energy reference | The only route to defensible whole-system energy claims (methodology §5.4) | Hardware cost. Captures PSU loss, GPU, fans and possibly the display, so an idle baseline must be subtracted. Meter accuracy and logging rate unknown |
| C. Different hardware (Intel RAPL machine, or a laptop for E3) | Better-studied counters (Intel) or OS estimates (E3) | Not the owner's machine. E3 values are estimates too. Splits the study across machines |
| D. Mark energy unsupported | Honest and simple | Loses a whole benchmark dimension the master prompt asks to investigate |

## Decision

### Owner decision (verbatim)

As recorded in [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md), scoping answer Q6 (that file records the owner's words verbatim-in-substance):

> Q6 Benchmark hardware: **This desktop, AMD CPU** (energy via AMD RAPL-equivalent counters through LibreHardwareMonitor where supported; else mark unsupported)

This quoted choice is what `decided_by: owner` and `status: accepted` cover (SCHEMA §10.4 rule 3(b)).

### Claude elaboration (binding only once this ADR is APPROVED in the plan app)

Everything below in this section is Claude's elaboration of the owner's choice. Under SCHEMA §10.4 it binds implementation only after the owner approves this ADR in the plan app; until then it is a proposal.

**Option A, as the owner decided, carried out under these integrity constraints. Option B is added if the owner provides a meter (Q-122).**

1. All benchmarks run on this desktop. Each trial records CPU model, core count, installed RAM (Chromium's process limit depends on RAM, methodology §2.1), Windows build, power plan, display configuration and window state.
2. Energy claims follow the claims policy in [raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md) §5.5:

   | Claim | Allowed with | Label / status |
   |---|---|---|
   | CPU-package energy | AMD MSR energy counter via PawnIO | Always labelled "AMD package energy counter (modeled; excludes DRAM; not wall energy)" |
   | System energy | An external meter only | Supported only if Q-122 provides a meter |
   | Per-process energy | — | **Unsupported**. Never estimated |

3. **No kernel driver is installed** until the owner approves Q-123. **WinRing0 is never installed.**
4. **Process separation for elevation.** The energy sampler runs as a separate elevated process. Ferrum, the baseline and the browsers always run non-elevated.
5. If the counters cannot be read, or validation fails, `metric-*` energy pages get `support: unsupported` and `exp-energy` is reported as not measurable.

## Consequences

### Positive

- Uses the owner's real hardware, and the result labels match what can actually be measured.
- Integrity: an energy number never appears without its limitations.

### Negative

- The energy results are likely weaker than the owner assumed (modeled package energy only) unless a meter is bought.
- The harness gets more complex: a separate elevated sampler, clock alignment between processes, counter wrap handling and integration error.
- Installing a kernel driver is both a security decision and a measurement perturbation, and needs owner sign-off.

### Follow-ups

- P1 (read-only, with owner consent): record the CPU model and RAM via `Get-CimInstance Win32_Processor` / `Win32_PhysicalMemory`, as an answer to Q-116.
- P6: an energy-sampler validation sub-task. It establishes the energy unit and wrap period, compares LHM against direct MSR reads, runs `powercfg /srumutil`, and runs an A/A test to get the noise floor.

### Related risks and phases

- Risks: `risk-r04` (primary, strengthened by research), `risk-r05` (process attribution, which affects any energy-per-product framing).
- Phases: `phase-p6-benchmark-harness` (sampler), `phase-p7-lifecycle` (the E term of the objective J = αM + βE + γL depends on this ADR), `phase-p8-research-paper` (threats to validity). Experiment: `exp-energy`.

## Verification / evidence

- Owner answer Q6: [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md).
- Research: [raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md) §5 and [raw/research/related-work-seed.md](../raw/research/related-work-seed.md) E1, E4, E6.
- Required P6 evidence: an energy-sampler validation report under `wiki/raw/evidence/phase-p6-benchmark-harness/`, stating per metric whether the dimension is `supported` or `unsupported`.
