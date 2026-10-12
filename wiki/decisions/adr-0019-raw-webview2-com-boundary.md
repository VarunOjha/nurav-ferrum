---
id: adr-0019
type: decision
title: "Raw WebView2 COM access confined to one audited module behind a safe Rust API"
status: accepted
updated: 2026-10-11
sources:
  - raw/00-master-prompt.md
  - raw/research/tauri-webview2-capabilities.md
  - raw/research/measurement-methodology.md
  - raw/owner/2026-10-11-s01-wave2-answers.md
  - raw/owner/2026-10-11-s01-wave2-pages-approval.md
related: [adr-0007, adr-0008, adr-0010, adr-0015, adr-0018, risk-r03, risk-r01, phase-p2-minimal-container, phase-p4-security, phase-p5-telemetry, phase-p7-lifecycle, comp-webview-manager, comp-webview2-runtime, comp-resource-manager, comp-network-logger, comp-security-engine]
approvable: true
date: 2026-10-08
decided_by: claude-proposed
supersedes: []
options:
  - "Ad hoc with_webview + unsafe COM calls wherever a feature needs them"
  - "One platform module (crates/webview-manager, webview2 submodule) owning all unsafe COM, exposing a safe API"
  - "No raw COM at all; drop features Tauri does not expose"
phase: phase-p0-planning
tags: [unsafe, com, webview2, architecture]
unverified:
  - claim: "COM event handlers registered via with_webview on Tauri-created webviews coexist with wry's own handlers without interference"
    verify_in: phase-p2-minimal-container
---

# ADR-0019: Raw WebView2 COM access is confined to one audited module behind a safe Rust API

> **Status: approved by the owner on 2026-10-11 (Approval Wave 2).** Proposed by Claude: it was not in the owner's scoping answers. Research for P0 showed that several owner-required features are reachable **only** through raw WebView2 COM, so a deliberate boundary is needed before code exists. The owner answered Q-110 ("Yes, one audited module") and Q-211 ("Two small extra modules", point 3 of the Decision) in [raw/owner/2026-10-11-s01-wave2-answers.md](../raw/owner/2026-10-11-s01-wave2-answers.md) and approved this page in [raw/owner/2026-10-11-s01-wave2-pages-approval.md](../raw/owner/2026-10-11-s01-wave2-pages-approval.md).

## Context

The master prompt says: "Do not introduce unsafe Rust without documenting the need and invariants" (§15). It also says: "Do not assume Tauri exposes every WebView2 feature directly. When necessary, investigate lower-level integrations and document their limitations" (§3).

Research ([raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md) §5, §6, §9; VERIFIED) found these needs reachable only through raw COM via `Webview::with_webview`:

| Need | COM API | Driven by |
|---|---|---|
| Suspend / resume | `TrySuspend` / `Resume` (`ICoreWebView2_3`) | Lifecycle (`phase-p7-lifecycle`), `risk-r03` |
| Memory target | `MemoryUsageTargetLevel` (`ICoreWebView2_19`); in wry but not in Tauri | Lifecycle |
| Network metadata | `WebResourceResponseReceived` (`ICoreWebView2_2`) or CDP `Network.*` | Network log ([ADR-0008](adr-0008-network-logging-metadata-jsonl.md)) |
| Crash detection | `ProcessFailed` and `BrowserProcessExited` | Crash recovery (master prompt §11) |
| Iframe navigation and external schemes | `FrameNavigationStarting`, `LaunchingExternalUriScheme` | Security engine ([ADR-0015](adr-0015-navigation-posture-open-blocklist.md)) |
| Authoritative permissions | `PermissionRequested` + `SavesInProfile(FALSE)` | App-authoritative permissions |
| Process attribution | `GetProcessExtendedInfos`, `BrowserProcessId` | Telemetry and harness |
| Optional | `GoBack` / `GoForward`; HTTP status via `NavigationCompleted` args | Navigation UX |

Facts that constrain any design:

- **Everything is `unsafe`.** All `webview2-com` COM calls are `unsafe`.
- **Main thread only.** `with_webview` runs its closure on the main thread.
- **Leaks.** Handlers must be unregistered, or the controller closed, or reference cycles keep webviews alive.
- **Re-entrancy.** Async completions must not block the UI thread.
- **Version match.** `webview2-com` 0.39 and `windows` 0.62 must match Tauri's versions so the COM types unify (§1).
- **Suspend constraints.** `TrySuspend` requires `IsVisible == false`. It must not be mixed with `MemoryUsageTargetLevel` (§6).

## Options considered

| Option | Pros | Cons |
|---|---|---|
| A. Ad hoc `with_webview` + `unsafe` wherever needed | Fast to start | `unsafe` scattered across crates. Invariants are duplicated or forgotten. Handler leaks are hard to audit |
| B. **One platform module owns all COM** (proposed: a `webview2` submodule of `crates/webview-manager`, per [ADR-0018](adr-0018-repo-root-cargo-workspace.md)); every other crate calls a safe Rust API (events as channels, commands as async fns) | One place to audit. A single `## Unsafe invariants` section. Uniform handler lifetime management (register and unregister tokens tied to tab lifetime). Testable seam: the trait can be mocked in unit tests | An upfront abstraction cost. The API surface must be designed carefully |
| C. No raw COM | No `unsafe` | Cannot deliver the network log, suspend-based lifecycle, crash recovery or iframe policy. That contradicts owner decisions (Q5, the master prompt's lifecycle and security requirements) |

## Decision

**Option B.**

1. All `unsafe` WebView2 COM code lives in one module. `#![deny(unsafe_code)]` is set in every other Ferrum crate, except for the two Windows modules of point 3.
2. The `comp-webview-manager` component page sets `unsafe_code: true` and carries the `## Unsafe invariants` section, as SCHEMA §6.2 requires. It covers:
   - thread affinity (main thread only);
   - handler-token ownership and removal on tab close;
   - no blocking in completion handlers;
   - interface availability checked via `cast` with graceful degradation when the runtime is too old;
   - the `TrySuspend` and `MemoryUsageTargetLevel` mutual-exclusion rule.
3. **Two Windows-platform exceptions (owner answer to Q-211, option a, 2026-10-11).** Win32 process and Job Object calls for measurement are also `unsafe`. They live in exactly two more modules: `telemetry::win` (comp-telemetry) and `bench::win` (comp-benchmark-harness). Each is the only `unsafe` code in its crate (`unsafe_code` allowed on that module only, denied in the rest of the crate), and each component page carries its own `## Unsafe invariants` section (SCHEMA §6.2). No WebView2 COM call may move into them.
3. The safe API exposes:
   - `suspend` / `resume` / `set_memory_target`;
   - `subscribe_network_events`, `subscribe_process_failed` and `subscribe_frame_navigation`;
   - `process_infos`;
   - `go_back` / `go_forward`.

   Every result reports **best-effort** outcomes explicitly. `TrySuspend` may return `isSuccessful=false`.
4. Each COM capability enters only in the phase that needs it, with a test:
   - P2: navigation status and crash detection;
   - P4: iframe and external-scheme interception, permissions;
   - P5: network events and process infos;
   - P7: suspend and memory target.

## Consequences

### Positive

- Auditable `unsafe`, as the master prompt §15 requires. Security reviewers have one module to read.
- If [ADR-0010](adr-0010-isolation-webview2-profiles.md) option (c) (raw-COM tab controllers) is ever chosen, it grows from this module rather than from scattered code.

### Negative

- More design work in P2 before the first COM feature lands.
- Whether raw-COM handlers on Tauri-created webviews coexist with wry's own handlers (`NavigationStarting`, `NewWindowRequested`, …) is UNVERIFIED[phase-p4-security]. P2 did not need it: tab views are Ferrum-created (adr-0029), and on the Tauri-created shell P2 only reads a setting and moves focus ([check-p2.12](../raw/evidence/phase-p2-minimal-container/check-p2.12.txt)).

### Follow-ups

- Owner: approved on 2026-10-11 (Q-110, Q-211 answered).
- P2: implement the module skeleton with one capability (`ProcessFailed` → error state in the UI), plus a test that a renderer crash surfaces as an error page and not as a hang.

### Related risks and phases

- Risks: `risk-r03` (primary), `risk-r01`.
- Phases: `phase-p2-minimal-container`, `phase-p4-security`, `phase-p5-telemetry`, `phase-p7-lifecycle`.

## Verification / evidence

- Reachability facts: [raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md) §5, §6, §9.
- Continuous check:
  - `rg -n "unsafe" crates/ apps/` shows hits only inside the three designated modules (the WebView2 COM module, `telemetry::win`, `bench::win`);
  - `cargo clippy` passes with `unsafe_code` denied elsewhere.

  Both run in CI from P2 on.
