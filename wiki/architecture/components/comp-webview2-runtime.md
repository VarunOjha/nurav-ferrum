---
id: comp-webview2-runtime
type: component
title: "Microsoft Edge WebView2 Runtime (external)"
status: planned
updated: 2026-10-18
sources:
  - raw/01-scoping-decisions.md
  - raw/research/tauri-webview2-capabilities.md
  - raw/research/measurement-methodology.md
related: [ov-arch-webview2-integration, ov-arch-isolation-model, ov-arch-trust-boundaries, comp-webview-manager, comp-app-shell, comp-tab-content, comp-baseline-app, comp-benchmark-harness, risk-r01, risk-r03, risk-r05, risk-r06, phase-p1-foundation, phase-p4-security, adr-0010]
approvable: true
path: null
crate: null
trust_level: external
phase_introduced: phase-p1-foundation
shipped: false
external_version: "154.0.4258.62 Evergreen (observed 2026-10-08, raw/01-scoping-decisions.md)"
responsibilities:
  - "Chromium-based rendering engine hosting the shell WebView and all tab WebViews"
  - "Process model: one browser process per user data folder, renderers, GPU and helper processes"
  - "Chromium sandbox, TLS validation, same-origin policy, site isolation (never weakened by Ferrum); that WebView2 applies site isolation and renderer sandboxing equivalently to Chrome is assumed (UNVERIFIED[phase-p6-benchmark-harness]; re-targeted in P4: P4 saw a separate renderer per site and refused cross-site reads, but compared nothing with Chrome and did not inspect the sandbox)"
  - "Profiles (per controller at creation), TrySuspend, MemoryUsageTargetLevel, ProcessFailed, DevTools Protocol"
interfaces:
  - "ICoreWebView2* COM interfaces via webview2-com 0.39 (bindings up to ICoreWebView2_28)"
  - "Environment variables WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS, WEBVIEW2_USER_DATA_FOLDER"
connects:
  - to: comp-webview-manager
    label: "WebView2 events (NavigationStarting, FrameNavigationStarting, NewWindowRequested, DownloadStarting, PermissionRequested, LaunchingExternalUriScheme, ProcessFailed) and CDP events"
    kind: webview2-com
    crosses_trust_boundary: true
  - to: comp-app-shell
    label: "WebMessageReceived (IPC delivery with browser-reported source)"
    kind: webview2-com
    crosses_trust_boundary: true
  - to: comp-tab-content
    label: "loads and renders remote HTTPS content in renderer processes (sandboxing assumed, verified in P4)"
    kind: network
    crosses_trust_boundary: true
unverified:
  - claim: "WebView2 applies Chromium site isolation and renderer sandboxing equivalently to Chrome"
    verify_in: phase-p6-benchmark-harness
---

# comp-webview2-runtime (external)

This is an external runtime that Ferrum and the baseline both depend on. It is not shipped by Ferrum: it is the Evergreen runtime installed on the system, version recorded in the [scoping record](../../raw/01-scoping-decisions.md). Whether to benchmark on Evergreen, on a pinned Fixed Version runtime, or on both is an open owner question raised in the [measurement note §5](../../raw/research/measurement-methodology.md). Every trial records the exact runtime version.

Capability reachability (Tauri vs wry vs raw COM) is in [ov-arch-webview2-integration](../ov-arch-webview2-integration.md). Which processes are shared is in [ov-arch-isolation-model](../ov-arch-isolation-model.md). On Evergreen, binaries are hard-linked with Edge on eligible systems when the versions match (VERIFIED, [measurement note §6.2](../../raw/research/measurement-methodology.md)); that they then share mapped image pages is DERIVED. This matters for shared-page accounting against cfg-edge.

## Security properties: assumed, not verified

Ferrum relies on WebView2's Chromium sandbox, renderer process isolation and site isolation, but no research note verifies that these behave in WebView2 as they do in Chrome. P4 saw no renderer process shared between two sites' pages ([check-p4.7](../../raw/evidence/phase-p4-security/check-p4.7.txt), [check-p4.15](../../raw/evidence/phase-p4-security/check-p4.15.txt)), and cross-site reads were refused ([security suite](../../raw/evidence/phase-p4-security/security-suite.20261017-2315.txt)), but it compared nothing with Chrome and did not inspect the sandbox. So they remain **assumptions** (UNVERIFIED[phase-p6-benchmark-harness], re-targeted in P4: P6 runs Chrome and Ferrum side by side; adr-0010), and no Ferrum page may present them as established properties.
