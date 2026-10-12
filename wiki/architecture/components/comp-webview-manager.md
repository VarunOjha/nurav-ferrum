---
id: comp-webview-manager
type: component
title: "WebView manager (tab WebViews, navigation, sessions, raw COM layer)"
status: planned
last_verified_commit: e1b725e
updated: 2026-10-11
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/research/tauri-webview2-capabilities.md
  - raw/research/measurement-methodology.md
related: [ov-arch-webview2-integration, ov-arch-isolation-model, ov-arch-lifecycle-state-machine, ov-arch-data-flows, ov-arch-trust-boundaries, comp-app-shell, comp-security-engine, comp-resource-manager, comp-telemetry, comp-network-logger, comp-core, comp-webview2-runtime, comp-tab-content, adr-0007, adr-0010, risk-r01, risk-r02, risk-r03, phase-p2-minimal-container, phase-p3-tabs-sessions, phase-p7-lifecycle, adr-0019, risk-r07, risk-r18, adr-0029, adr-0030]
approvable: true
path: crates/webview-manager/
crate: ferrum-webview-manager
trust_level: trusted
phase_introduced: phase-p2-minimal-container
shipped: true
unsafe_code: true
responsibilities:
  - "Create and destroy tab WebViews behind the TabHost trait (master prompt 4)"
  - "Manage navigation: navigate, back, forward, reload, stop; route every navigation through the security engine (master prompt 4)"
  - "Track per-tab state (url, title, loading, error, lifecycle state) and emit tab events to the shell (master prompt 4)"
  - "Manage persistent sessions: session.json store, lazy restore (master prompt 4, Phase 2)"
  - "Handle external links and new-window requests (master prompt 4)"
  - "Handle downloads via the DownloadStarting event with security decisions (master prompt 4)"
  - "Apply site-specific configuration incl. profile assignment per isolation mode (master prompt 4)"
  - "Implement LifecycleActuator: hide, TrySuspend/Resume, MemoryUsageTargetLevel, discard (Close), restore"
  - "Own the only raw-COM module for WebViews (webview2::*): nav, perm, lifecycle, events (ProcessFailed), procinfo, netlog, probe"
  - "Produce the WebView2 environment PID set for telemetry"
interfaces:
  - "TabHost trait: create_tab, close_tab, set_bounds, set_visible, with_core"
  - "TabManager API: open, close, activate, navigate, back, forward, reload, stop, snapshot, restore"
  - "LifecycleActuator impl (trait from ferrum-core)"
  - "Safe COM wrappers: try_suspend, resume, set_memory_level, go_back, go_forward, process_infos, enable_netlog, run_probe"
connects:
  - to: comp-webview2-runtime
    label: "create, position, show and hide child tab WebViews; navigate; TrySuspend/Resume; Close (controllers Ferrum creates with raw COM from Tauri's environment, adr-0029)"
    kind: webview2-com
    crosses_trust_boundary: true
  - to: comp-webview2-runtime
    label: "in-process DevTools Protocol session (Runtime.evaluate; Network.enable only if the alternative netlog route is chosen) via CallDevToolsProtocolMethod"
    kind: cdp
    crosses_trust_boundary: true
  - to: comp-security-engine
    label: "evaluate navigation, frame navigation, new-window, download, permission and external-scheme requests"
    kind: rust-api
    crosses_trust_boundary: false
  - to: comp-network-logger
    label: "metadata-only network events (allow-listed fields)"
    kind: rust-api
    crosses_trust_boundary: false
  - to: comp-telemetry
    label: "navigation timings, tab events, environment PID set"
    kind: rust-api
    crosses_trust_boundary: false
  - to: comp-app-shell
    label: "tab state events (url, title, loading, error, lifecycle state)"
    kind: tauri-event
    crosses_trust_boundary: false
  - to: comp-core
    label: "shared types, ids, event definitions"
    kind: rust-api
    crosses_trust_boundary: false
unverified:
  - claim: "Raw-COM events (NavigationStarting, NewWindowRequested, DownloadStarting, NavigationCompleted, PermissionRequested) cover for tabs what Tauri's hooks would have done"
    verify_in: phase-p2-minimal-container
---

# comp-webview-manager

This crate owns every tab WebView. **It is the only place in Ferrum where WebView2 COM is called** (see the [integration layer](../ov-arch-webview2-integration.md)).

## Module sketch

| Module | Content | unsafe |
|---|---|---|
| `host` | `TabHost` trait with the `RawComHost` backend (owner-approved adr-0029; a `TauriChildHost` only as a fallback if Tauri ships per-webview profiles), [integration §3](../ov-arch-webview2-integration.md). `RawComHost` feasibility was verified in P1 (spike S2, [report](../../raw/evidence/phase-p1-foundation/spike-s2-profiles.md); chosen by adr-0029) | no (RawComHost delegates to `webview2`) |
| `tab` | Per-tab state, driven by WebView2 events registered in `webview2::events` (`NavigationStarting`, `SourceChanged`, `NavigationCompleted`, `NewWindowRequested`, `DownloadStarting`, `PermissionRequested`, `HistoryChanged`; adr-0029, adr-0030) | no |
| `session` | `session.json` snapshot store, shared by restore and discard | no |
| `actuator` | `LifecycleActuator` implementation with the two-phase discard ([state machine §2](../ov-arch-lifecycle-state-machine.md)) | no |
| `webview2::{nav, perm, lifecycle, events, procinfo, netlog, probe, profile}` | Thin safe wrappers over `webview2-com` 0.39 | **yes** |

## Unsafe invariants

`unsafe` is allowed only in `mod webview2`, under the invariants **COM-1 … COM-9** in [ov-arch-webview2-integration §4](../ov-arch-webview2-integration.md):

- UI thread only;
- never block on async completions;
- `cast` with graceful degradation;
- remove every event token and `Close()` controllers on discard;
- no borrowed COM data outlives its callback;
- `TrySuspend` only when hidden, and never mixed with MemoryUsageTargetLevel;
- identical environment options per UDF;
- `webview2-com`/`windows` versions equal Tauri's;
- allow-list reduction of CDP/COM event data before it leaves the handler.

Each `unsafe` block cites its invariant ids in a `// SAFETY:` comment.

## Phase plan

- phase-p2-minimal-container: one tab (a Ferrum-created controller), navigation, back/forward through the history calls (adr-0030), error states, external links, keyboard focus after Alt+Tab (S1 known issue).
- phase-p3-tabs-sessions: many tabs, session store, downloads, per-site config, one WebView2 profile name per site (adr-0029).
- phase-p4-security: raw-COM fail-closed navigation (tabs have no Tauri `on_navigation`; adr-0029), frame navigation, `LaunchingExternalUriScheme`, `SavesInProfile(FALSE)`, `ProcessFailed` recovery.
- phase-p5-telemetry: `procinfo` and `netlog`.
- phase-p7-lifecycle: actuator (suspend, memory level, discard, restore) and guard probes.
