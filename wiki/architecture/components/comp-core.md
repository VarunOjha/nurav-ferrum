---
id: comp-core
type: component
title: "Core crate (shared types, config schema, traits)"
status: planned
last_verified_commit: d3ad7ee
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/research/tauri-webview2-capabilities.md
related: [ov-arch-crate-graph, ov-arch-configuration, comp-app-shell, comp-webview-manager, comp-security-engine, comp-resource-manager, comp-telemetry, comp-network-logger, comp-benchmark-harness, adr-0018, phase-p1-foundation]
approvable: true
path: crates/core/
crate: ferrum-core
trust_level: trusted
phase_introduced: phase-p1-foundation
shipped: true
unsafe_code: false
responsibilities:
  - "Shared identifiers: TabId, SiteKey, ProfileName, RunId"
  - "Configuration schema structs with defaults, validation and canonical hashing (config_sha256)"
  - "Event and record types: NavTiming, NetRecord, LifecycleTransition, ProcessSample, DeniedAction"
  - "Traits for dependency inversion: LifecycleActuator, Clock"
  - "Common error types"
interfaces:
  - "config::Config, config::load(layers) -> Config, config::hash(&Config)"
  - "types::*, events::*, traits::{LifecycleActuator, Clock}"
connects: []
---

# comp-core

The leaf crate. `#![forbid(unsafe_code)]`. It depends on serde (and similar) only: **no Tauri, no `windows`, no Ferrum crate**. Every other Rust crate depends on it ([crate graph](../ov-arch-crate-graph.md)). It is introduced in phase-p1-foundation as part of the workspace scaffold, so later phases share one set of types from day one.

It has no outgoing `connects` edges because it calls nothing. Every other Rust component points to it.
