---
id: comp-app-shell
type: component
title: "Application shell (Tauri host + vanilla-TS shell UI)"
status: planned
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/research/tauri-webview2-capabilities.md
related: [ov-arch-system-overview, ov-arch-trust-boundaries, ov-arch-data-flows, ov-arch-configuration, comp-webview-manager, comp-security-engine, comp-resource-manager, comp-telemetry, comp-network-logger, comp-core, comp-tab-content, comp-webview2-runtime, comp-windows-os, adr-0006, adr-0007, adr-0015, risk-r02, phase-p2-minimal-container, phase-p3-tabs-sessions]
approvable: true
path: apps/desktop/
crate: ferrum-desktop
trust_level: trusted
phase_introduced: phase-p2-minimal-container
shipped: true
unsafe_code: false
responsibilities:
  - "Window creation and layout of shell bands vs the active tab rectangle (master prompt 4: window creation)"
  - "Custom navigation controls: back, forward, reload, stop (master prompt 4)"
  - "Tab strip and tab management UI (master prompt 4)"
  - "Address bar with URL normalisation (https default) (master prompt 4)"
  - "Sidebar (master prompt 4)"
  - "Keyboard shortcuts (master prompt 4, Phase 2)"
  - "Settings interface rendered in the trusted shell WebView only (master prompt 4)"
  - "Split-view support in a later phase (master prompt 4)"
  - "Host the Tauri runtime: register app commands, capability files (shell only, no remote), app ACL manifest"
  - "Compose and wire all Ferrum crates (channels between telemetry, resource manager and webview manager)"
  - "User confirmation dialogs for external schemes, downloads and permissions; open-in-system-browser for Google OAuth"
interfaces:
  - "Tauri commands (PROPOSAL): tab_create, tab_close, tab_activate, tab_navigate, tab_back, tab_forward, tab_reload, tab_stop, settings_get, settings_set, session_list, download_list, external_open_confirm, netlog_open_folder"
  - "Events consumed: tab-updated, tab-blocked, tab-lifecycle, download-updated, permission-request, external-scheme-request"
  - "CLI: --config <path> (experiment override)"
connects:
  - to: comp-webview-manager
    label: "tab and navigation commands (create, close, activate, navigate, back, forward, reload)"
    kind: rust-api
    crosses_trust_boundary: false
  - to: comp-security-engine
    label: "settings edits to policy (blocklist, permissions, schemes)"
    kind: rust-api
    crosses_trust_boundary: false
  - to: comp-resource-manager
    label: "user interaction signals and lifecycle exclusions"
    kind: rust-api
    crosses_trust_boundary: false
  - to: comp-telemetry
    label: "startup marks (window visible, shell ready)"
    kind: rust-api
    crosses_trust_boundary: false
  - to: comp-network-logger
    label: "network log settings (enable, folder)"
    kind: rust-api
    crosses_trust_boundary: false
  - to: comp-core
    label: "load and save configuration; shared types"
    kind: rust-api
    crosses_trust_boundary: false
  - to: comp-webview2-runtime
    label: "hosts the trusted shell WebView (local bundled UI only)"
    kind: webview2-com
    crosses_trust_boundary: true
  - to: comp-windows-os
    label: "confirmed external URI hand-off and open-in-system-browser"
    kind: os-api
    crosses_trust_boundary: true
unverified:
  - claim: "Tauri unstable multi-webview focus, resize and z-order issues are workable on Windows"
    verify_in: phase-p1-foundation
---

# comp-app-shell: application shell

The Ferrum desktop application. It has two halves in one component:

1. **Shell UI.** Vanilla TypeScript + Vite (adr-0006), in `apps/desktop/ui/`, rendered in the **trusted shell WebView** at the local app origin.
2. **Tauri host.** The `ferrum-desktop` crate in `apps/desktop/src-tauri/`. It owns the window, registers commands, holds the capability files and wires the other crates together.

## Design notes

- **Layout under the child-WebView model (adr-0007).** Shell chrome occupies fixed bands, and the active tab's child WebView fills the remaining rectangle. Child WebViews render above the shell (Tauri issue #15682, [Tauri note §2](../../raw/research/tauri-webview2-capabilities.md)). So menus, dropdowns, settings and dialogs **never overlap the tab rectangle**. Either the shell temporarily hides the active tab WebView, or the overlay is drawn inside the shell bands. Focus after Alt+Tab (#13466) and resize with a custom title bar (#12207) are known issues. Whether they are workable is UNVERIFIED[phase-p1-foundation]. Avoid a custom title bar initially.
- **Capabilities.** Exactly one capability file, `shell.json`, targets `"webviews": ["shell"]`. **No capability declares `remote`.** A CI check enforces this ([trust boundaries R1–R3](../ov-arch-trust-boundaries.md)).
- **Commands are async.** Tab creation happens on async commands because `add_child` deadlocks from synchronous handlers on Windows (VERIFIED, Tauri note §2).
- **No web storage in the shell** (trust rule R9). Settings go through `settings_get`/`settings_set` to Rust-side `config.toml`.
- **Secure defaults** (master prompt §5): DevTools only in dev builds, a strict CSP, and no remote resources in the shell.

## Phase plan

- phase-p2-minimal-container (M1): shell plus **one** child tab WebView, address bar, back/forward/reload, loading/error states.
- phase-p3-tabs-sessions (M2): tabs, shortcuts, session restore, per-site settings UI, downloads list.
- phase-p4-security (M3): permission and external-scheme prompts, blocked-navigation UI.
- Later: sidebar, split view.
