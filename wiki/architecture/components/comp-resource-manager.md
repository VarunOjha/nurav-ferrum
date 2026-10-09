---
id: comp-resource-manager
type: component
title: "Resource manager (lifecycle state machine and policies)"
status: planned
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/research/tauri-webview2-capabilities.md
  - raw/research/related-work-seed.md
  - raw/research/measurement-methodology.md
related: [ov-arch-lifecycle-state-machine, ov-arch-configuration, ov-arch-data-flows, comp-webview-manager, comp-telemetry, comp-core, comp-app-shell, risk-r03, phase-p7-lifecycle, exp-lifecycle-policies, risk-r23]
approvable: true
path: crates/resource-manager/
crate: ferrum-resource-manager
trust_level: trusted
phase_introduced: phase-p7-lifecycle
shipped: true
unsafe_code: false
responsibilities:
  - "Track process memory and CPU via telemetry samples (master prompt 4)"
  - "Track WebView activity and last user interaction per tab (master prompt 4)"
  - "Identify inactive sessions (master prompt 4)"
  - "Apply lifecycle policies none, fixed-idle, memory-pressure, adaptive (master prompt 4, 6)"
  - "Reclaim resources where supported: hide, TrySuspend or MemoryUsageTargetLevel, discard (master prompt 4)"
  - "Restore discarded sessions (master prompt 4)"
  - "Enforce safety guards and two-phase discard; fail-safe when guards are unknown (master prompt 5 Phase 4)"
  - "Emit LifecycleTransition records for every state change"
interfaces:
  - "decide(snapshot, inputs, config, now) -> Vec<Action> (pure)"
  - "Policy trait with impls NoPolicy, FixedIdle, MemoryPressure, Adaptive"
  - "LifecycleActuator (trait in ferrum-core, implemented by webview-manager)"
connects:
  - to: comp-webview-manager
    label: "lifecycle actions via LifecycleActuator trait (hide, suspend, set memory level, discard, restore)"
    kind: rust-api
    crosses_trust_boundary: false
  - to: comp-telemetry
    label: "lifecycle transition and policy decision records"
    kind: rust-api
    crosses_trust_boundary: false
  - to: comp-core
    label: "lifecycle config and state types"
    kind: rust-api
    crosses_trust_boundary: false
---

# comp-resource-manager

Implements the [lifecycle state machine](../ov-arch-lifecycle-state-machine.md). `#![forbid(unsafe_code)]`, with no Tauri or COM dependency. It acts only through the `LifecycleActuator` trait. Its inputs (process samples, the memory-pressure signal) arrive as `ferrum-core` values that `ferrum-desktop` forwards from telemetry.

**Determinism for research.** The decision function is pure, with an injected clock and no randomness. Policy behaviour can therefore be replayed from recorded inputs and unit-tested exhaustively, including property tests that ACTIVE is never discarded and that unknown guards never lead to a discard.

**Introduced in phase-p7-lifecycle (M6).** Earlier phases only hide background tabs, which is done by the webview manager when the active tab changes. That baseline behaviour is the `none` policy.
