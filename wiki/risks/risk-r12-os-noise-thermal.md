---
id: risk-r12
type: risk
title: "Windows background activity, thermal drift and window-state effects add noise and bias"
status: open
updated: 2026-10-08
sources:
  - raw/research/measurement-methodology.md
  - raw/01-scoping-decisions.md
related: [phase-p6-benchmark-harness, phase-p5-telemetry, comp-benchmark-harness, exp-baseline-footprint, exp-energy, exp-reliability, exp-startup, risk-r11, risk-r14, risk-r25, qual-testing-strategy]
approvable: true
tags: [noise, thermal, benchmark, windows]
likelihood: 4
impact: 4
mitigation: "Run a recorded pre-flight checklist before every campaign (power plan, AC, Windows Update paused, Defender state, indexing state, fixed display and single monitor, no other user apps); fix the window state (visible, same size and monitor, not occluded) for every product; log CPU temperature and require cool-down to the session baseline between trials; interleave products in randomized blocks; measure the noise floor with A/A tests."
spike: null
owner_phase: phase-p6-benchmark-harness
trigger: "A/A tests report a difference; idle baselines drift between blocks; package temperature does not return to baseline; background processes appear in the system snapshot during trials."
fallback: "Lengthen cool-downs, add blocks, or move runs to quieter times; report the observed noise floor and widen the stated minimum detectable effect."
unverified:
  - claim: "Chromium applies EcoQoS to its background processes on this Windows build"
    verify_in: phase-p6-benchmark-harness
  - claim: "Tamper Protection prevents disabling Defender real-time scanning on this machine"
    verify_in: phase-p6-benchmark-harness
---

# risk-r12: Windows background activity, thermal drift and window-state effects add noise and bias

| Likelihood | Impact | Score | Status | Owner phase |
|---|---|---|---|---|
| 4 | 4 | 16 | open | `phase-p6-benchmark-harness` |

Score = likelihood × impact (SCHEMA §6.5). Scales are planning judgements, not measurements. Full register: [ov-risk-register](ov-risk-register.md).

## Description and evidence

Verified in MM §3 and §6.3:
- Since Windows 11, if a window-owning process is fully occluded, minimised or otherwise invisible, Windows does **not guarantee** a timer resolution higher than the system default. Idle CPU and energy therefore depend on **window visibility**.
- Windows applies its own **EcoQoS** heuristics when a process does not opt in.
- Chromium's soft process limit depends on installed RAM.

The controls in MM §6.3 are derived recommendations: fixed power plan, AC power, Windows Update paused, Defender left on but recorded, fixed display, temperature logging and cool-down, randomized blocks so slow drift spreads across arms.

Sources: [measurement-methodology](../raw/research/measurement-methodology.md), [scoping decisions](../raw/01-scoping-decisions.md). Abbreviations: TW = tauri-webview2-capabilities, MM = measurement-methodology, RW = related-work-seed, NX = nextjs-stack, LW = llm-wiki-pattern.

## Early-warning signs (trigger)

A/A tests report a difference; idle baselines drift between blocks; package temperature does not return to baseline; background processes appear in the system snapshot during trials.

## Mitigation

Run a recorded pre-flight checklist before every campaign (power plan, AC, Windows Update paused, Defender state, indexing state, fixed display and single monitor, no other user apps); fix the window state (visible, same size and monitor, not occluded) for every product; log CPU temperature and require cool-down to the session baseline between trials; interleave products in randomized blocks; measure the noise floor with A/A tests.

## De-risking spike (proposed)

Phase: `phase-p6-benchmark-harness`. Run an A/A campaign (the same product as two arms) under the full pre-flight checklist; the result defines the noise floor used for sample-size decisions (see risk-r25).

The `spike` frontmatter field stays `null` until the owning phase page assigns a task id (`pN.M`); the integrator or phase owner then sets it here.

## Fallback if realised

Lengthen cool-downs, add blocks, or move runs to quieter times; report the observed noise floor and widen the stated minimum detectable effect.

## Unverified claims

- Chromium applies EcoQoS to its background processes on this Windows build. UNVERIFIED[phase-p6-benchmark-harness]
- Tamper Protection prevents disabling Defender real-time scanning on this machine. UNVERIFIED[phase-p6-benchmark-harness]

## Affects

`phase-p6-benchmark-harness`, `phase-p5-telemetry`, `comp-benchmark-harness`, `exp-baseline-footprint`, `exp-energy`, `exp-reliability`, `exp-startup`, `risk-r11`, `risk-r14`, `risk-r25`, `qual-testing-strategy`
