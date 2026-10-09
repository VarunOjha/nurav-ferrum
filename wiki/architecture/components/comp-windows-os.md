---
id: comp-windows-os
type: component
title: "Windows 11 OS APIs (external)"
status: planned
updated: 2026-10-08
sources:
  - raw/01-scoping-decisions.md
  - raw/research/measurement-methodology.md
related: [comp-telemetry, comp-benchmark-harness, comp-app-shell, ov-arch-data-flows, risk-r04, risk-r05, phase-p1-foundation, phase-p5-telemetry, phase-p6-benchmark-harness]
approvable: true
path: null
crate: null
trust_level: external
phase_introduced: phase-p1-foundation
shipped: false
external_version: "Windows 11 Pro 10.0.26200 x64 (observed 2026-10-08, raw/01-scoping-decisions.md)"
responsibilities:
  - "Process counters: GetProcessMemoryInfo (EX/EX2), GetProcessTimes, QueryProcessCycleTime"
  - "Job Objects for process-tree containment and accounting (harness)"
  - "ETW process tracing for cross-checks (harness, needs elevation)"
  - "System memory status / memory-pressure signal (source to be verified in phase-p7-lifecycle)"
  - "Shell hand-off for external URI schemes and open-in-system-browser"
interfaces:
  - "Win32 APIs via the windows crate 0.62"
connects: []
---

# comp-windows-os (external)

A modelling node, added by the architecture area, so that `os-api` edges have an explicit endpoint. Facts about these APIs (summability of `PrivateUsage`, Job accounting including exited processes, EX2 availability on this build, timer resolution and EcoQoS effects on hidden windows) are taken from the [measurement note](../../raw/research/measurement-methodology.md). Which Windows signal to use for memory pressure is not covered by any research note yet. It is decided in phase-p7-lifecycle ([state machine](../ov-arch-lifecycle-state-machine.md)).
