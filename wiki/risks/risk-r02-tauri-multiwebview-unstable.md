---
id: risk-r02
type: risk
title: "Tauri multi-webview (child WebViews in one window) is behind the unstable feature"
status: open
updated: 2026-10-08
sources:
  - raw/research/tauri-webview2-capabilities.md
  - raw/01-scoping-decisions.md
related: [phase-p1-foundation, phase-p2-minimal-container, phase-p3-tabs-sessions, adr-0007, adr-0006, comp-app-shell, comp-webview-manager, risk-r01, risk-r20, qual-testing-strategy]
approvable: true
tags: [tauri, multi-webview, ui, stability]
likelihood: 4
impact: 4
mitigation: "Pin tauri exactly; create child webviews only from async commands off the UI thread; design the shell so no shell UI ever overlaps tab bounds; keep a regression test per known Windows issue (focus after Alt+Tab, resize, z-order, text-editing shortcuts, blank webviews) and re-run it on every Tauri upgrade."
spike: p1.5
owner_phase: phase-p1-foundation
trigger: "Hang or deadlock while creating a tab; child webviews render white or only the last one renders; keyboard focus lost after Alt+Tab; text-editing shortcuts fail; shell dropdowns hidden under tab content; a Tauri release changes add_child."
fallback: "Host tab controllers outside Tauri's webview manager with raw COM in child HWNDs (route c of risk-r01), or one top-level window per tab; either needs an ADR superseding adr-0007."
unverified:
  - claim: "Each listed open unstable-flag issue reproduces (or not) on tauri 2.12.1 on Windows 11"
    verify_in: phase-p1-foundation
  - claim: "Async creation of child webviews from a spawned task avoids the documented Windows deadlock in practice"
    verify_in: phase-p1-foundation
---

# risk-r02: Tauri multi-webview (child WebViews in one window) is behind the unstable feature

| Likelihood | Impact | Score | Status | Owner phase |
|---|---|---|---|---|
| 4 | 4 | 16 | open | `phase-p1-foundation` |

Score = likelihood × impact (SCHEMA §6.5). Scales are planning judgements, not measurements. Full register: [ov-risk-register](ov-risk-register.md).

## Description and evidence

The owner chose **child WebViews in one window**: a trusted shell webview plus one untrusted child webview per tab (adr-0007, Q4). In tauri 2.12.1, `Window::add_child` requires the **`unstable`** cargo feature and is desktop-only (TW §2). Its doc comment says that on Windows it **deadlocks when called from a synchronous command or event handler**, so tabs must be created from async commands on separate threads.

On 2026-10-08, 23 open issues carried the `scope: unstable flag` label (TW §2). The Windows-relevant or platform-unspecified ones listed in the note are #13466 (Alt+Tab focus), #12207 (resize with custom titlebar), #15682 (child webview always drawn above the main webview), #11124 (no z-order API), #9611 (fixed position plus auto-resize), #11376 (only the last child renders), #10011 (mostly white on load), #10521 (drag-and-drop events) and #9257 (text-editing shortcuts). The issue *contents* were not reproduced, so whether each affects Ferrum is open.

Consequence for UI design (TW §2): because of #15682, shell menus and dropdowns cannot overlap tab content. In Tauri 3.0.0-alpha.4 `add_child` is still behind `unstable` and its signature changed, so a later migration is likely (see risk-r20).

Related gap: Tauri's `Webview` has no back/forward method; use `eval("history.back()")` or raw COM `GoBack`/`GoForward` (TW §2).

Sources: [tauri-webview2-capabilities](../raw/research/tauri-webview2-capabilities.md), [scoping decisions](../raw/01-scoping-decisions.md). Abbreviations: TW = tauri-webview2-capabilities, MM = measurement-methodology, RW = related-work-seed, NX = nextjs-stack, LW = llm-wiki-pattern.

## Early-warning signs (trigger)

Hang or deadlock while creating a tab; child webviews render white or only the last one renders; keyboard focus lost after Alt+Tab; text-editing shortcuts fail; shell dropdowns hidden under tab content; a Tauri release changes add_child.

## Mitigation

Pin tauri exactly; create child webviews only from async commands off the UI thread; design the shell so no shell UI ever overlaps tab bounds; keep a regression test per known Windows issue (focus after Alt+Tab, resize, z-order, text-editing shortcuts, blank webviews) and re-run it on every Tauri upgrade.

## De-risking spike (proposed)

Phase: `phase-p1-foundation`.
1. Window with a shell webview and three child webviews created from an `async` command on a spawned task; confirm no deadlock across repeated create/close cycles.
2. Resize, maximise, minimise and restore; confirm child bounds follow (`set_auto_resize`).
3. Alt+Tab away and back; type into a text field in a child; try Ctrl+A/C/V/Z.
4. Open a shell dropdown near a tab; confirm the layout rule (no overlap) works.
5. Record each result against the issue numbers above as P1 evidence.

Assigned by the integration pass (2026-10-08): task `p1.5`, phase-p1-foundation spike S1 (multi-webview).

## Fallback if realised

Host tab controllers outside Tauri's webview manager with raw COM in child HWNDs (route c of risk-r01), or one top-level window per tab; either needs an ADR superseding adr-0007.

## Unverified claims

- Each listed open unstable-flag issue reproduces (or not) on tauri 2.12.1 on Windows 11. UNVERIFIED[phase-p1-foundation]
- Async creation of child webviews from a spawned task avoids the documented Windows deadlock in practice. UNVERIFIED[phase-p1-foundation]

## Affects

`phase-p1-foundation`, `phase-p2-minimal-container`, `phase-p3-tabs-sessions`, `adr-0007`, `adr-0006`, `comp-app-shell`, `comp-webview-manager`, `risk-r01`, `risk-r20`, `qual-testing-strategy`
