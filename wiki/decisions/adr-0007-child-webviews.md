---
id: adr-0007
type: decision
title: "Child WebViews in one window (trusted shell + one untrusted child WebView per tab, Tauri multi-webview unstable feature)"
status: accepted
updated: 2026-10-08
sources:
  - raw/01-scoping-decisions.md
  - raw/research/tauri-webview2-capabilities.md
related: [adr-0006, adr-0010, adr-0015, adr-0019, risk-r02, risk-r01, phase-p1-foundation, phase-p2-minimal-container, phase-p3-tabs-sessions, phase-p4-security, comp-app-shell, comp-webview-manager, comp-security-engine, comp-webview2-runtime]
approvable: true
date: 2026-10-08
decided_by: owner
supersedes: []
options:
  - "Child WebViews in one window via Tauri Window::add_child (unstable feature)"
  - "One top-level window per tab"
  - "Single WebView that navigates between sites (no real tabs)"
  - "Shell in Tauri; tab WebView2 controllers created directly via raw COM in child HWNDs"
phase: phase-p0-planning
tags: [architecture, webview, tauri, unstable]
unverified:
  - claim: "The open unstable-flag issues (focus after Alt+Tab, resize with custom titlebar, white/only-last-child rendering) affect Ferrum's configuration on this machine"
    verify_in: phase-p1-foundation
  - claim: "Whether WebView2 lets a remote page navigate a tab top-level to the app's local origin (http://tauri.localhost or tauri://)"
    verify_in: phase-p4-security
---

# ADR-0007: Child WebViews in one window

## Context

Ferrum needs a trusted browser-like shell plus multiple tabs showing arbitrary, untrusted HTTPS sites ([raw/00-master-prompt.md](../raw/00-master-prompt.md) §2, §5). Scoping question Q4 asked for the hosting model. The owner chose **"Child WebViews in one window — trusted shell WebView + one untrusted child WebView per tab (Tauri 2 multi-webview, `unstable` feature; documented risk)"** ([raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md)).

Research findings, all from [raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md) and VERIFIED unless marked:

- **Feature gate (§2).** `Window::add_child(webview_builder, position, size)` requires the `unstable` cargo feature in tauri 2.12.1. In tauri 3.0.0-alpha.4 it is still gated, with a changed signature. The risk is confirmed and does not go away with Tauri 3.
- **Deadlock (§2).** Doc comment: on Windows, creating webviews from a **synchronous command or event handler deadlocks**. Use `async` commands or separate threads.
- **Open issues (§2).** 23 issues labelled `scope: unstable flag` were open on 2026-10-08. The Windows-relevant ones:
  - #13466: focus after Alt+Tab;
  - #12207: resize with a custom titlebar;
  - #15682: the child webview always draws above the main webview (z-order);
  - #11124: no z-order API;
  - #10011 and #11376: white or only-last-child rendering;
  - #9257: text-editing shortcuts.

  Whether they affect Ferrum's exact configuration is UNVERIFIED[phase-p1-foundation].
- **Positioning and back/forward (§2).** Child webviews do not resize with the window unless `auto_resize` is enabled. There is **no `go_back`/`go_forward`** on Tauri's `Webview`; use `eval("history.back()")` or raw COM `GoBack`/`GoForward`.
- **IPC exposure (§3).** The Tauri IPC bridge is attached to **every** webview, including remote tab webviews. Protection is authorisation in Rust: remote origins can reach commands only through an explicit `remote` capability. Capability matching accepts a webview-label match **or** a window-label match, and a window-label match also covers the child tabs in that window.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| A. **Child WebViews in one window (`add_child`, `unstable`)** | Browser-like UX in one window. Tauri hooks (`on_navigation`, `on_new_window`, `on_download`, `on_permission_request`) available per tab. Shell and tabs can share one WebView2 environment, so one browser process | `unstable` feature with many open issues. Z-order means shell popups cannot overlap tabs. Deadlock pitfall. A Tauri 3 migration is coming |
| B. One top-level window per tab | Uses stable Tauri APIs only | Not browser-like. Tab switching means window switching. Window state also affects Windows 11 timer resolution and EcoQoS behaviour ([raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md) §3), which complicates measurement |
| C. Single WebView that navigates between sites | Simplest | No real tabs. Fails master prompt Phase 2 (multiple tabs, session restore) and lifecycle research (no background sessions to manage) |
| D. Shell in Tauri; tab controllers created via raw COM (`webview2-com`) in child HWNDs | Full control of WebView2 (profiles at creation, suspend, `ProcessFailed`, CDP). Avoids the `unstable` feature for tabs | Loses Tauri's per-tab hooks. All tab plumbing becomes `unsafe` COM owned by Ferrum. Much more code and risk. Kept as the **fallback** (also option (c) in [ADR-0010](adr-0010-isolation-webview2-profiles.md)) |

## Decision

### Owner decision (verbatim)

As recorded in [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md), scoping answer Q4 (that file records the owner's words verbatim-in-substance):

> Q4 WebView hosting model: **Child WebViews in one window** — trusted shell WebView + one untrusted child WebView per tab (Tauri 2 multi-webview, `unstable` feature; documented risk)

This quoted choice is what `decided_by: owner` and `status: accepted` cover (SCHEMA §10.4 rule 3(b)).

### Claude elaboration (binding only once this ADR is APPROVED in the plan app)

Everything below in this section is Claude's elaboration of the owner's choice. Under SCHEMA §10.4 it binds implementation only after the owner approves this ADR in the plan app; until then it is a proposal.

**Option A**, accepted by the owner, with these binding implementation rules from research:

1. **Labels and capabilities.** The shell webview's label is `shell` and each tab is labelled `tab-<id>`. The shell capability targets **webview label `shell`**. **No capability ever declares a `remote` section.** An app ACL manifest is shipped so that local commands are ACL-checked too.
2. **Threading.** Tabs are created and destroyed **only from async commands or a dedicated thread**, never from synchronous commands or event handlers. A P1 spike test covers this.
3. **Layout.** Each tab webview uses explicit `set_bounds` on window resize, or `auto_resize` where that does not conflict with fixed positioning (#9611). Exactly one tab is visible at a time. Hidden tabs use `hide()`, which maps to WebView2 `IsVisible=false` (VERIFIED §2). That is also a precondition for `TrySuspend` in P7.
4. **No local origin in tabs.** Tabs are never navigated to the app's local origin. `on_navigation` blocks it. Whether a remote page can force such a navigation is UNVERIFIED[phase-p4-security] and must be a negative security test.
5. **Back and forward** use `eval("history.back()")` / `eval("history.forward()")` in P2 unless the raw-COM route is approved ([ADR-0019](adr-0019-raw-webview2-com-boundary.md)).
6. **Pinning.** Stay on Tauri 2.x, with exact versions pinned in P1. Re-evaluate on each Tauri 2.x minor release.

## Consequences

### Positive

- Browser-like UX that matches the owner's choice. One WebView2 environment can be shared by shell and tabs, which is the basis for the shared-browser-process isolation model in [ADR-0010](adr-0010-isolation-webview2-profiles.md).
- Tauri's navigation, new-window, download and permission hooks cover most of the M1–M3 needs without raw COM.

### Negative

- **Fragility.** Any of the open `unstable` issues may block P2 or P3 (focus, resize, rendering). They are tracked under `risk-r02`.
- **UX constraint.** Shell DOM cannot overlap tab content (#15682). See [ADR-0006](adr-0006-shell-ui-vanilla-ts-vite.md).
- **Shared environment options.** All webviews on one user-data folder must use **identical environment options**: `additional_browser_args`, extensions, proxy and language ([raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md) §6). So a benchmark-only flag such as `--remote-debugging-port` applies to the shell and all tabs together.
- **IPC reachability.** Every tab can technically post IPC messages. Security rests on correct ACL configuration, and P4 tests must prove the denial end to end, including the internal `FETCH_CHANNEL_DATA_COMMAND` exemption (§3).
- **Fail-open navigation filter.** `on_navigation` is main-frame only and **fails open** on unparsable URLs (§4). See [ADR-0015](adr-0015-navigation-posture-open-blocklist.md).

### Follow-ups

- **P1 de-risking spike** (task id on `phase-p1-foundation`): one window with a shell webview plus two child webviews loading HTTPS pages. It must check creation from an async command, resize, show/hide, focus after Alt+Tab, keyboard shortcuts and text editing. Record the result in `wiki/raw/evidence/phase-p1-foundation/`.
- If the spike fails badly, DECIDE again between option D (raw-COM tabs) and option B, through a superseding ADR approved by the owner.
- P4 security tests: invoke from a tab webview must be rejected for core plugin commands, app commands, event emit/listen and `FETCH_CHANNEL_DATA_COMMAND`.

### Related risks and phases

- Risks: `risk-r02` (primary), `risk-r01` (profiles at creation, which option D would solve).
- Phases: `phase-p1-foundation` (spike), `phase-p2-minimal-container`, `phase-p3-tabs-sessions`, `phase-p4-security`.

## Verification / evidence

- Owner answer Q4: [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md).
- API facts: [raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md) §2, §3, §9 (crate source of tauri 2.12.1 / wry 0.57.0, read 2026-10-08; nothing compiled).
- Required evidence: the P1 spike report, and the P4 IPC-denial test output under `wiki/raw/evidence/phase-p4-security/`.
