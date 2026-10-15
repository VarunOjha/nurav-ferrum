---
id: comp-webview-manager
type: component
title: "WebView manager (tab WebViews, navigation, sessions, raw COM layer)"
status: implemented
last_verified_commit: ebc79ca
updated: 2026-10-14
sources:
  - raw/evidence/phase-p4-security/check-p4.18.20261014-1720.txt
  - raw/owner/2026-10-14-s07-p4-18-exe-download-fix-a.md
  - raw/research/smartscreen-webview2.md
  - raw/evidence/phase-p4-security/check-p4.18.txt
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
    label: "create, position, show and hide child tab WebViews; navigate; TrySuspend/Resume; Close (controllers Ferrum creates with raw COM from Tauri's environment, adr-0029, or in isolation mode per-site-udf from a site's own environment, p4.15)"
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
  - claim: "Raw-COM PermissionRequested covers for tabs what Tauri's permission hooks would have done"
    verify_in: phase-p4-security
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

Raw-COM events instead of Tauri's hooks: `NavigationStarting`, `NewWindowRequested` and `NavigationCompleted` were
verified in P2 for the content view (checks [p2.6](../../raw/evidence/phase-p2-minimal-container/check-p2.6.txt), [p2.8](../../raw/evidence/phase-p2-minimal-container/check-p2.8.txt),
[p2.10](../../raw/evidence/phase-p2-minimal-container/check-p2.10.txt)); `DownloadStarting` was verified in P3 (p3.8: the file, its size and contents, completion and failure; [check-p3.8](../../raw/evidence/phase-p3-tabs-sessions/check-p3.8.txt)); `PermissionRequested` belongs to the permission work of P4 and is UNVERIFIED[phase-p4-security].

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

## Implementation status (P2, first working app)

Built in P2 (evidence in [the P2 evidence folder](../../raw/evidence/phase-p2-minimal-container/)). The module sketch above is the full plan; P2 built this part
of it:

- `src/webview2.rs`, the only raw-COM module (`#![allow(unsafe_code)]` here only; every block has a `// SAFETY: COM-n`
  comment). `ContentView::create` makes a WebView2 controller from Tauri's environment with its own profile
  (`ferrum-default`) and sets `AreDevToolsEnabled` to the build type. Events registered and removed again in `close`:
  `NavigationStarting` (with the gate), `SourceChanged`, `NavigationCompleted` (HTTP status, web error status and the
  final address), `HistoryChanged`, `DocumentTitleChanged`, `GotFocus`, `NewWindowRequested` (always handled, so
  WebView2 opens no window) and `LaunchingExternalUriScheme` (always cancelled). Methods: `navigate`, `go_back`,
  `go_forward`, `reload`, `stop`, `set_bounds`, `set_visible`, `focus`, `source`, `devtools_enabled`, `close`.
- `src/tab.rs`: `TabEvent`, `NavDecision` and the P2 gate (web pages and `about:blank` only).
- `src/error.rs`: the typed `Error` (`Com { code, message }`, `NoController`).
- Observed in P2: the view's `AreDevToolsEnabled = false` blocks F12 and the context menu, but a direct
  `OpenDevToolsWindow` call still opens DevTools, so Ferrum has no such call ([check-p2.12](../../raw/evidence/phase-p2-minimal-container/check-p2.12.txt)). A
  redirect back to the current address raises no `SourceChanged`, so `NavigationCompleted` carries the final address
  ([check-p2.9](../../raw/evidence/phase-p2-minimal-container/check-p2.9.txt)).

## Implementation status (P3, tabs and sessions)

- p3.2, one view per tab: `VIEWS` (a UI-thread map from tab id to `ContentView`) and `ENVIRONMENT` (Tauri's WebView2
  environment, saved once from the shell, `save_environment`; every tab view comes from it, COM-7). The navigation
  gate now receives a `NavRequest` (address, user-initiated, redirected). New: `is_visible`, `renderer_process_count`
  (counts renderer processes with `GetProcessInfos`, as in spike S3) and `send_to_back`.
- Observed in P3 (p3.2): with the shell filling the window, Windows kept the shell's window above the tab views, so the
  page was hidden under the shell (the CDP smoke tests could not see this; a screenshot and the child-window order
  did). `send_to_back` moves the shell's host window to the bottom of the stacking order at start and after each
  new tab view; the p3.2 check reads the order ([check-p3.2](../../raw/evidence/phase-p3-tabs-sessions/check-p3.2.txt)).
- p3.3: `ContentView::create` takes `Handlers { sink, gate, keys }`; `AcceleratorKeyPressed` (on the controller,
  token removed in `close`) hands each key-down to `keys` (`KeyDown`: virtual key, Ctrl and Shift from
  `GetKeyState`, Alt from `IsMenuKeyDown`, repeat from `WasKeyDown`) and marks Ferrum's keys handled. Observed: CDP
  key events never reach this hook; real key presses do.
- Observed in P3: WebView2's `IsUserInitiated` was `true` for a pop-up a script opened 800 ms after load, without a
  click, so Ferrum's new-tab rule does not rely on it (comp-app-shell).

- p3.6, profiles: each tab view is created with the profile name the app chooses (one per site by default, adr-0029);
  a tab that moves to another site gets a new view in that profile (the old one is closed once the new one exists).
  **What the profiles share** (exit criterion of P3; detail and sources on
  [ov-arch-isolation-model](../ov-arch-isolation-model.md) §3): one WebView2 environment and browser process with
  identical options and one user data folder (`EBWebView`; VERIFIED, adr-0029 and spike S2), the remote debugging port
  when it is on (observed in p3.6). Separate per profile: cookies (observed in p3.6), preferences and HTTP cache
  (VERIFIED, multi-profile doc). Not yet checked (P4): renderer, network-service, audio and crash processes, web
  storage and service workers, HSTS, DNS and socket pools.

- p3.8, downloads: `DownloadStarting` (ICoreWebView2_4; token removed in `close`) asks the app for the file
  (`Handlers::downloads`), sets `ResultFilePath` and `Handled` (no WebView2 download pop-up), and follows the
  `DownloadOperation` (`BytesReceivedChanged`, `StateChanged`) as tab events `DownloadStarted`, `DownloadProgress` and
  `DownloadFinished`; the operation and its tokens are kept in `DOWNLOADS` until it ends, so a download outlives its
  tab. Observed: a download whose connection broke off was started again by WebView2 several times (six attempts; only
  the last reported its end); the app shows the retries as one line ([check-p3.8](../../raw/evidence/phase-p3-tabs-sessions/check-p3.8.txt)).
- p3.16, site icons: `FaviconChanged` (ICoreWebView2_15; token removed in `close`) asks for the icon with
  `GetFavicon` as PNG; the completion reads the stream (at most 256 KB, else nothing) and sends tab event
  `FaviconChanged { png }` (empty: the page has none). WebView2 gives the icon it already loaded; Ferrum makes no
  request of its own.

## Implementation status (P4, security)

- p4.3, every navigation through one gate: `FrameNavigationStarting` (token removed in `close`) passes each frame
  navigation, and each of its redirect hops, to the same `Handlers::gate` as the page's own `NavigationStarting`;
  `NavRequest` gained `frame`. A cancelled frame navigation is reported as tab event `FrameNavigationStarting { id,
  uri, redirected, allowed }`. The P2 scheme-only gate (`tab::web_gate`) is removed: the app's gate asks the security
  engine instead (comp-security-engine, "Implementation status (P4)"). Observed in the p4.3 live test: WebView2 ends a
  cancelled page navigation with `NavigationCompleted` (not successful, web error "cancelled"), so the shell keeps its
  "Blocked" note through that event.

- p4.5, permissions: `PermissionRequested` (token removed in `close`) hands each request to `Handlers::permissions`
  (`PermissionAsk`: page address, kind as its settings name, user-initiated), sets `State` to allow or deny, and sets
  `SavesInProfile(false)` through `ICoreWebView2PermissionRequestedEventArgs3` (degrades to WebView2's default when the
  cast fails, COM-3), so no answer is remembered in the profile; reported as tab event `PermissionRequested`. Observed
  in the p4.5 live test: a grant removed in settings took effect at the next request; a frame's request arrived at
  this page-level event.
- p4.20, the permission question (adr-0034): `Handlers::permissions` returns `PermissionReply::{Allow, Deny, Wait}`;
  `PermissionAsk` carries a request number `id`. For `Wait` the handler takes the request's deferral (`GetDeferral`)
  and keeps it in a UI-thread table; `webview2::answer_permission(id, allow)` sets the state and completes it later;
  `close` refuses every request of that view that still waits. A request without a deferral is refused. The tab event
  `PermissionRequested` gained `waiting`. Observed in the p4.20 live test
  ([check-p4.20](../../raw/evidence/phase-p4-security/check-p4.20.txt)): the page keeps running while its request
  waits; a frame of another site that its page allowed (`allow` attribute) is reported with the page's origin; one its
  page did not allow never reaches this event (Chromium refuses it).

- p4.7, isolation: `ContentView::create` takes `private` (InPrivate view, `SetIsInPrivateModeEnabled`);
  `clear_profile` deletes one profile's data (`ICoreWebView2Profile2::ClearBrowsingDataAll` through a hidden helper view
  in that profile, closed afterwards); `process_inventory` lists WebView2's processes with the frames each renderer
  hosts (`ICoreWebView2Environment13::GetProcessExtendedInfos`). Observed: releasing the frame list before using its
  iterator ended the whole process, so the list is kept alive while it is read.
- **What separate site profiles share, from the p4.7 tests and process inventory** ([check-p4.7](../../raw/evidence/phase-p4-security/check-p4.7.txt)):
  one browser process, one GPU process and two utility processes serve every profile (and the shell); the network
  service therefore is shared, and with it HSTS, DNS and connections (derived, not tested); the remote debugging port
  when it is on (p3.6); the runtime files on disk. Kept apart per profile (tested): cookies, localStorage and
  IndexedDB; clearing one site's profile leaves the others intact. Not shared in the test: renderers (each site's page
  had its own; Chromium does this for different sites anyway). Not tested: service workers, audio. Full table:
  [ov-arch-isolation-model](../ov-arch-isolation-model.md) §3.

- p4.10, failed processes: `ProcessFailed` (token removed in `close`) is reported as tab event `ProcessFailed { failure,
  reason, exit_code }`; `ProcessFailure` names WebView2's kind (`BrowserExited`, `RendererExited`,
  `RendererUnresponsive`, `FrameRendererExited`, `Other`) and `page_lost()` says whether the tab needs a reload (the
  first three). `watch_browser_exit` registers `BrowserProcessExited` (ICoreWebView2Environment5) on the environment for
  the app's whole run (failed or normal exit). Observed in the p4.10 live test ([check-p4.10](../../raw/evidence/phase-p4-security/check-p4.10.txt)):
  the browser's own `edge://kill` page (spike S3 method) raised `RendererExited` with reason 2 (terminated) and exit
  code 1 on the tab's view, the view stayed usable and a new navigation started a new page process; another site's tab
  and the shell kept running. Two tabs of the same site had separate page processes in this test, so only the killed tab was marked; the test asserts the rule either way (every tab whose page ran in the ended process is marked crashed), but the shared case itself was not seen. `edge://inducebrowsercrashforrealz` ended the browser process: every tab view
  got `BrowserExited`, then the environment's `BrowserProcessExited` (failed) arrived.

- p4.15, a user data folder per site: `site_environment(key, folder, exited, done)` makes a WebView2 environment on a
  site's own folder (`CreateCoreWebView2EnvironmentWithOptions`), once per key, and hands it to every caller (callers
  that ask while it is being made wait for the same one); `site_environment_ready`, `site_environments` and
  `close_all_views` (closes every tab view and forgets the site environments; the app calls it when Ferrum is asked to
  exit). Options are copied from Tauri's environment (COM-7): `SHELL_BROWSER_ARGUMENTS` (Ferrum's own switches since p4.18,
  see below), the user's interface
  language, no extensions, the default scroll bars. `Environment` names the environment type for the app; `Error`
  gained `NoEnvironment`. Observed in the p4.15 live test ([check-p4.15](../../raw/evidence/phase-p4-security/check-p4.15.txt),
  [isolation-modes](../../raw/evidence/phase-p4-security/isolation-modes.md)): with two sites open, three environments (the shell's and one per
  site), each with its own browser, GPU and two utility processes; a site's browser process ended by itself when the
  site's last tab closed, and a new one started when the site was opened again. When a site environment was still held
  as Ferrum ended, Ferrum's process did not exit for more than 15 seconds after the quit; `close_all_views` on the exit
  request fixed it (the process then ended in about 0.1 s in that run).

Not yet built: `procinfo` and `netlog` (P5); the lifecycle actuator (P7).
- p4.18, SmartScreen back on (owner answer Q-225): `SHELL_BROWSER_ARGUMENTS` is now Ferrum's own string,
  `--disable-features=msWebOOUI,msPdfOOUI --autoplay-policy=no-user-gesture-required` (wry 0.57's default without
  `msSmartScreenProtection`; the two Edge-menu switches and autoplay kept). The app passes it to Tauri for the shell's
  environment (and the IPC self-test's view, same folder), and `site_environment` uses it for every site environment,
  so all environments stay identical (COM-7). Unit test `browser_arguments_keep_smartscreen_on`. Observed live
  ([check-p4.18](../../raw/evidence/phase-p4-security/check-p4.18.txt)): in all three isolation modes no browser process
  has `msSmartScreenProtection` on its command line; Microsoft's demo phishing page is blocked (tab title "Reported
  Unsafe Site: Navigation Blocked"). What SmartScreen sends: [research note](../../raw/research/smartscreen-webview2.md).
  Downloads changed with it (owner answer, [raw](../../raw/owner/2026-10-14-s07-p4-18-exe-download-fix-a.md)): with
  SmartScreen on, a program download from the test server stayed in progress for ever (watched 120 s; the partial file
  is removed when Ferrum closes), most likely because SmartScreen waits for a "Keep or delete?" answer in WebView2's own
  download pop-up, which `Handled` hid. `DownloadFilter` now returns a `DownloadChoice { path, own_dialog }`; with
  `own_dialog` the pop-up is not hidden (`SetHandled(false)`). New tab event `DownloadDialog { open }` from
  `IsDefaultDownloadDialogOpenChanged` (ICoreWebView2_9; token removed in `close`). Observed: the pop-up opens about
  0.4 s after a program download starts and the download waits there; whether "Keep" then completes it is a manual
  check ([check-p4.18 second run](../../raw/evidence/phase-p4-security/check-p4.18.20261014-1720.txt)). No WebView2 function was found that lets the app answer
  SmartScreen's question itself.
