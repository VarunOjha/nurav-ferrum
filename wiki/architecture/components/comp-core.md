---
id: comp-core
type: component
title: "Core crate (shared types, config schema, traits)"
status: implemented
last_verified_commit: 9df1157
updated: 2026-10-11
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

## Implementation status (P2, first working app)

Built in P2 (evidence in [the P2 evidence folder](../../raw/evidence/phase-p2-minimal-container/)):

- `config`: the settings schema (`[session]`, `[security]`, `[storage]`), `load` (user file, then `--config`),
  `validate`, `parse`, canonical form and `hash` (`sha256:`), warnings; unknown keys are refused.
- `address`: `normalize` turns address-bar input into navigate, confirm (links to other apps) or refuse; `site` keeps
  only the scheme and host of an address for the log.
- `oauth`: `classify` recognises the start of a Google sign-in (endpoint recorded in
  [google-oauth-endpoint](../../raw/research/google-oauth-endpoint.md)); a test-only pattern only when the app passes
  one (debug builds).

Unit tests: `crates/core/tests/{config,address,oauth,tabs}.rs`.

## Implementation status (P3, tabs and sessions)

- `tabs` (p3.1): `Tabs<T>`, the tab model without any window: `TabId` (counts up, never reused), `open` at the end or
  after the active tab, `close` (the active tab's right-hand neighbour takes over, else the left one), `activate`,
  `move_to`, `activate_next`/`activate_previous` (wrap around), a closed-tab stack of at most 25 with `reopen_closed`,
  and `check` for the rules. Tested with fixed cases and 200 random sequences of 500 operations
  ([check-p3.1](../../raw/evidence/phase-p3-tabs-sessions/check-p3.1.txt)).
- `config` (p3.2): `[security] new_window` gains `"new-tab"`, now the default (`same-view` was the P2 default). Not yet built: shared ids, event and record types, and the
`LifecycleActuator` and `Clock` traits (later phases).
