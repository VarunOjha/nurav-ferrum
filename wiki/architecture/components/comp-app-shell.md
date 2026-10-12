---
id: comp-app-shell
type: component
title: "Application shell (Tauri host + vanilla-TS shell UI)"
status: implemented
last_verified_commit: 9df1157
updated: 2026-10-11
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/research/tauri-webview2-capabilities.md
  - raw/owner/2026-10-10-s01-browser-ui-choice.md
related: [ov-arch-system-overview, ov-arch-trust-boundaries, ov-arch-data-flows, ov-arch-configuration, comp-webview-manager, comp-security-engine, comp-resource-manager, comp-telemetry, comp-network-logger, comp-core, comp-tab-content, comp-webview2-runtime, comp-windows-os, adr-0006, adr-0007, adr-0015, adr-0028, risk-r02, phase-p2-minimal-container, phase-p3-tabs-sessions]
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
  - claim: "A strict content security policy for the shell is workable, so fonts and assets can be bundled locally"
    verify_in: phase-p2-minimal-container
  - claim: "Tauri unstable multi-webview focus, resize and z-order issues are workable on Windows"
    verify_in: phase-p2-minimal-container
---

# comp-app-shell: application shell

The Ferrum desktop application. It has two halves in one component:

1. **Shell UI.** Vanilla TypeScript + Vite (adr-0006), in `apps/desktop/` (`index.html`, `src/`), rendered in the **trusted shell WebView** at the local app origin.
2. **Tauri host.** The `ferrum-desktop` crate in `apps/desktop/src-tauri/`. It owns the window, registers commands, holds the capability files and wires the other crates together.

## Look

The owner chose how the browser looks ([adr-0028](../../decisions/adr-0028-browser-look-tabs-top-ferrum-panel.md),
option A of the design canvas, 2026-10-10): tabs across the top with the Windows 11 window buttons at the right; a
toolbar with back, forward, reload, a rounded address bar with a lock, a shield button with a blocked count, a panel
toggle and a menu; the website in the middle; and a **Ferrum panel** on the right (about 352 px) with memory, CPU,
sleeping tabs, blocked sites and this tab's network log (metadata only, adr-0008). Sleeping tabs show a moon. Calm
warm grey, one rust-orange accent, IBM Plex Sans and Mono, light and dark. No AI assistant. Frozen design:
[option-a.dc.html](../../raw/evidence/phase-p0-planning/browser-ui/option-a.dc.html). All numbers on it are samples;
nothing is measured. The panel's sections fill in as later phases land (P4 blocking, P5 measurement and network log,
P7 sleeping tabs). Proposed (not yet approved): the fonts are bundled with the app, since the shell is meant to load
no remote resources (strict policy, UNVERIFIED[phase-p2-minimal-container]).

**Title bar.** Option A as drawn puts the tabs in the window's top bar, which needs a custom title bar; the design
notes below advise against one at first (resize problem, Tauri issue #12207, UNVERIFIED[phase-p3-tabs-sessions]; not tested in P1 because spike S1 used the normal title bar). Until
P1 has checked it, the early shell may show the normal Windows title bar above the tab strip. Open question
[Q-125](../../overview/ov-open-questions.md#q-125-tabs-in-the-windows-top-bar-custom-title-bar-or-the-normal-windows-title-bar-first)
asks the owner which way to go.

## Design notes

- **Layout under the child-WebView model (adr-0007).** Shell chrome occupies fixed bands, and the active tab's child WebView fills the remaining rectangle. Child WebViews render above the shell (Tauri issue #15682, [Tauri note §2](../../raw/research/tauri-webview2-capabilities.md)). So menus, dropdowns, settings and dialogs **never overlap the tab rectangle**. Either the shell temporarily hides the active tab WebView, or the overlay is drawn inside the shell bands. Focus after Alt+Tab (#13466) was seen in P1 ([S1 report](../../raw/evidence/phase-p1-foundation/spike-s1-multiwebview.md); owner: fix later) and its fix is UNVERIFIED[phase-p2-minimal-container]; resize and z-order behaved as designed in S1. Resize with a custom title bar (#12207) is UNVERIFIED[phase-p3-tabs-sessions]. Avoid a custom title bar initially.
- **Capabilities.** Exactly one capability file, `shell.json`, targets `"webviews": ["shell"]`. **No capability declares `remote`.** A CI check enforces this ([trust boundaries R1–R3](../ov-arch-trust-boundaries.md)).
- **Commands are async.** Tab creation runs from async commands: creating web views from a synchronous handler deadlocks on Windows (VERIFIED, Tauri note §2; reproduced in spike S1). Under adr-0029 the shell asks `webview-manager`, which creates the tab controller on the UI thread through `with_webview` and reports completion asynchronously.
- **No web storage in the shell** (trust rule R9). Settings go through `settings_get`/`settings_set` to Rust-side `config.toml`.
- **Secure defaults** (master prompt §5): DevTools only in dev builds, a strict CSP, and no remote resources in the shell.

## Phase plan

- phase-p2-minimal-container (M1): shell plus **one** child tab WebView, address bar, back/forward/reload, loading/error states.
- phase-p3-tabs-sessions (M2): tabs, shortcuts, session restore, per-site settings UI, downloads list.
- phase-p4-security (M3): permission and external-scheme prompts, blocked-navigation UI.
- Later: the Ferrum panel's sections as their data sources land (adr-0028); split view.

## Implementation status (P2, first working app)

Built in P2 and checked by the task scripts (evidence in [the P2 evidence folder](../../raw/evidence/phase-p2-minimal-container/)); the frontmatter's
`last_verified_commit` is the last commit these checks passed on.

- **Window and layout.** One window `main`. The shell is a Tauri child web view `shell` in a band at the top (52 px
  toolbar, plus 44 px while a confirmation bar shows). One content view below it, created by `ferrum-webview-manager`
  (adr-0029). The two never overlap; while the shell's full error panel shows, the content view is hidden and the shell
  takes the window (`shell_cover`).
- **Shell UI** (`apps/desktop/index.html`, `src/main.ts`, `src/style.css`; Vite 8.3.4, TypeScript 7.0.2,
  `@tauri-apps/api` 2.12.3): back, forward, reload/stop, the address bar with the lock (only for a page that loaded
  over https), a status text, a progress bar, the confirmation bar (links that open outside Ferrum; Google sign-in),
  and the error panel with "Try again".
- **Tauri host** (`apps/desktop/src-tauri/src/`: `main.rs`, `content.rs`, `external.rs`, `logging.rs`, `selftest.rs`).
  Implemented commands, all shell-only (declared in `build.rs`, granted only by `capabilities/shell.json`, which has no
  `remote` section; [check-p2.3](../../raw/evidence/phase-p2-minimal-container/check-p2.3.txt)): `app_ping`, `app_quit`, `shell_layout`, `shell_cover`,
  `shell_focused`, `tab_navigate`, `tab_back`, `tab_forward`, `tab_reload`, `tab_stop`, `external_open_confirm`,
  `external_cancel`. One event to the shell, `tab`, with the kinds `navigation-starting`, `source-changed`,
  `navigation-completed`, `history-changed`, `title-changed`, `got-focus`, `new-window`, `external-scheme`,
  `external-request`, `sign-in-offer`, `blocked`. The interface list in the frontmatter stays the full plan.
- **Settings**: `config.toml` in the app config folder, `--config <path>` override (comp-core).
- **Shell security**: the CSP in `tauri.conf.json` allows only the app's own files and the IPC channel; fonts are not
  bundled (the shell names IBM Plex and falls back to Segoe UI and Consolas, all local). Developer tools only in debug
  builds ([check-p2.12](../../raw/evidence/phase-p2-minimal-container/check-p2.12.txt)).
- **Logs**: `ferrum.jsonl`, JSON lines, sites as scheme and host only ([check-p2.14](../../raw/evidence/phase-p2-minimal-container/check-p2.14.txt)).

Known limitations of this first version: one view and no tabs (P3); the normal Windows title bar; the Alt+Tab focus
fix (`restore_focus`) awaits the owner's manual check; opening a link in another app has been tested only with a
stand-in launcher (the owner's manual mailto check). The smoke robot uses WebView2's remote-debugging switch
(adr-0031); it is an environment variable that also works on release builds.
