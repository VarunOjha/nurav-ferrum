---
id: comp-tab-content
type: component
title: "Tab content (untrusted remote web content in child WebViews)"
status: planned
updated: 2026-10-11
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/research/tauri-webview2-capabilities.md
related: [ov-arch-trust-boundaries, ov-arch-isolation-model, ov-arch-data-flows, comp-app-shell, comp-webview-manager, comp-webview2-runtime, comp-security-engine, adr-0007, adr-0010, adr-0015, phase-p2-minimal-container, phase-p4-security, risk-r19, adr-0029]
approvable: true
path: null
crate: null
trust_level: untrusted
phase_introduced: phase-p2-minimal-container
shipped: false
responsibilities:
  - "Represents arbitrary remote HTTPS pages (and their scripts, iframes, popups) rendered in tab WebViews (master prompt 2)"
  - "Modelled as the primary adversary ADV1 in the threat model"
  - "Should have no Tauri IPC channel, because its web view is a controller Ferrum creates (adr-0029); if one appears, every command is denied"
interfaces:
  - "window.ipc.postMessage (expected absent in Ferrum-created controllers; if present, every invoke denied by ACL)"
  - "Page-initiated navigation, window.open, downloads, permission requests, external URI schemes"
connects:
  - to: comp-app-shell
    label: "no Tauri IPC bridge expected (adr-0029); if present, all commands denied by ACL (no remote capability)"
    kind: tauri-ipc
    crosses_trust_boundary: true
  - to: comp-webview2-runtime
    label: "page-initiated navigations, popups, downloads, permission and scheme requests"
    kind: webview2-com
    crosses_trust_boundary: true
unverified: []
---

# comp-tab-content (untrusted)

This is not Ferrum code. It is a **modelling node** that makes trust boundary TB1 explicit in the architecture graph. The architecture area added it to the registry. One child WebView per tab hosts remote content (adr-0007). Its connections show where untrusted input enters Ferrum:

- through the IPC channel, which Tauri injects into every WebView it creates (VERIFIED, [Tauri note §3](../../raw/research/tauri-webview2-capabilities.md)). Under adr-0029 tab views are controllers Ferrum creates itself, and they have no bridge (verified in P2 by the p2.3 negative test, [check-p2.3](../../raw/evidence/phase-p2-minimal-container/check-p2.3.txt)); any bridge that does appear is denied by ACL;
- through WebView2 events (navigation, popups, downloads, permissions), which go to the security engine.

`shipped: false` because Ferrum does not ship this content. The `webview2-com` kind on the second edge is approximate: the page acts through the runtime, which raises COM events.

Controls and tests: [ov-arch-trust-boundaries](../ov-arch-trust-boundaries.md).
