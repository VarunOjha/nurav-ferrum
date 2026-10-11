---
id: adr-0029
type: decision
title: "Tab web views are WebView2 controllers Ferrum creates itself, one profile per site, from Tauri's environment"
status: proposed
updated: 2026-10-11
sources:
  - raw/evidence/phase-p1-foundation/spike-s2-profiles.md
  - raw/evidence/phase-p1-foundation/spike-s2/s2-1.json
  - raw/evidence/phase-p1-foundation/spike-s1/auto-1.json
  - raw/evidence/phase-p1-foundation/spike-s3-raw-com.md
  - raw/research/tauri-webview2-capabilities.md
  - raw/01-scoping-decisions.md
related: [adr-0007, adr-0010, adr-0019, adr-0030, risk-r01, risk-r02, risk-r09, risk-r18, phase-p1-foundation, phase-p2-minimal-container, phase-p3-tabs-sessions, phase-p4-security, comp-webview-manager, comp-app-shell, comp-webview2-runtime, ov-open-questions]
approvable: true
date: 2026-10-11
decided_by: claude-proposed
supersedes: []
options:
  - "(a) Wait for Tauri PR 16054 (data_store_identifier as WebView2 profile name) to ship"
  - "(b) Patch tauri-runtime-wry to the PR 16054 fork branch"
  - "(c) Ferrum creates tab controllers with raw COM from Tauri's environment, ProfileName per site"
  - "(d) Per-site data_directory with Tauri child web views"
  - "(c') Tauri child web views with one shared profile in P2, choose (a) or (c) at P3 entry"
phase: phase-p1-foundation
tags: [webview2, profiles, isolation, architecture]
unverified:
  - claim: "Tauri's IPC bridge is not present in WebView2 controllers that Ferrum creates itself"
    verify_in: phase-p2-minimal-container
---

# ADR-0029: Tab web views are WebView2 controllers Ferrum creates itself, one profile per site

## Context

The owner chose per-site WebView2 profiles inside **one shared browser process** (Q7, adr-0010). A profile can only be
set when a controller is created, and Tauri 2.12.3 does not pass one through (risk-r01, open question Q-107). Spike S2
(p1.6) tested the routes on this machine
([spike S2 report](../raw/evidence/phase-p1-foundation/spike-s2-profiles.md)):

- **(a)** Tauri PR 16054 is still open and unmerged (GitHub API, 2026-10-11). Not available.
- **(b)** a fork patch was not run: it would put an unreviewed third-party branch under Ferrum.
- **(c)** controllers created with `ICoreWebView2Environment10::CreateCoreWebView2ControllerWithOptions` and
  `SetProfileName`, using **Tauri's own environment** and hosted in the Tauri window: every call S_OK; both sites and
  the shell share one `BrowserProcessId`; a cookie set by site A is not sent by site B.
- **(d)** per-site `data_directory`: works and isolates cookies, but each site gets its own browser process.

Spike S1 (p1.5) showed Tauri's multi-webview API works for the shell plus child views when created from async code,
with one design rule: a child view is drawn **on top of** the shell where they overlap
([spike S1 automatic results](../raw/evidence/phase-p1-foundation/spike-s1/auto-1.json); the S1 report follows the owner's hand checks). Spike S3 showed the raw COM calls
Ferrum needs work through `with_webview` and drafted the unsafe invariants
([spike S3 report](../raw/evidence/phase-p1-foundation/spike-s3-raw-com.md)).

## Options considered

| Option | For | Against |
|---|---|---|
| (a) wait for PR 16054 | no own unsafe code for tab creation | not released; date outside our control; P3 would wait |
| (b) patch tauri-runtime-wry | small diff | unreviewed fork in the supply chain; re-audit on every Tauri update; `[patch]` git source must be allowed in `deny.toml` |
| **(c) own tab controllers from Tauri's environment** | works today (S2); one browser process as Q7 wants; full control of profile, suspend, events (S3); untrusted tabs should not get Tauri's IPC bridge, because Tauri injects it only into web views it creates (UNVERIFIED[phase-p2-minimal-container], proven by the p2.3 negative test) | own unsafe COM for creation, bounds, navigation, events, close; tabs lose Tauri's per-webview hooks, which are re-implemented as raw COM events in the adr-0019 module |
| (d) per-site data folder | plain Tauri, no unsafe | one browser process per site, against Q7; more memory per site |
| (c') shared profile in P2, decide at P3 | least work now | tab hosting is built twice if P3 then switches to (c) |

## Decision

**Proposed: option (c).** From P2 on, the shell stays a Tauri child web view (trusted, with Tauri IPC). Each tab is a
WebView2 controller that Ferrum creates in the Tauri window with Tauri's environment, through the single audited raw-COM
module of adr-0019 (`crates/webview-manager`). In P2 every tab uses one profile; P3 gives each site its own profile
name (`ControllerOptions::SetProfileName`). The shell strip and tab bounds never overlap (S1: tabs are drawn on top).

This keeps the adr-0007 model (trusted shell, one untrusted web view per tab, one window) and changes only **how** tab
views are created: by Ferrum's raw-COM module instead of Tauri's `Window::add_child`. If the owner accepts this ADR, Claude
proposes the matching wording change to adr-0007 (and answers Q-107 with the owner's words) in the same approval round.

## Consequences

### Positive

- Q7 is met as decided: per-site profiles in one shared browser process (S2).
- Untrusted tab content should have no path to Tauri commands (no IPC bridge in raw controllers; UNVERIFIED[phase-p2-minimal-container], checked by the p2.3 negative test), which simplifies P4.
- Suspend, memory target, crash, network-response and history events are on the same controller (S3, adr-0030).

### Negative

- More unsafe code: creation, bounds, visibility, navigation, event registration and `Close` for every tab. It follows
  the S3 invariants and is confined to one module (adr-0019; risk-r18).
- Tauri hooks for tabs (`on_navigation`, `on_new_window`, `on_download`, `on_page_load`) are replaced by COM events
  (`NavigationStarting`, `NewWindowRequested`, `DownloadStarting`, `NavigationCompleted`); this is P2 work.
- All controllers share Tauri's environment, so environment options stay identical for shell and tabs (risk-r09).
- If Tauri later ships PR 16054, Ferrum may move back to Tauri-created tabs through a superseding ADR.

## Verification / evidence

- Route (c) creation, shared `BrowserProcessId` and cookie isolation: [spike-s2-profiles.md](../raw/evidence/phase-p1-foundation/spike-s2-profiles.md), [s2-1.json](../raw/evidence/phase-p1-foundation/spike-s2/s2-1.json).
- Overlap rule and async-only creation: [auto-1.json](../raw/evidence/phase-p1-foundation/spike-s1/auto-1.json), [sync-1.json](../raw/evidence/phase-p1-foundation/spike-s1/sync-1.json).
- Raw COM reachability and invariants: [spike-s3-raw-com.md](../raw/evidence/phase-p1-foundation/spike-s3-raw-com.md).
- Still to verify in P2: COM event replacements for the Tauri hooks, and tab controllers living next to the Tauri shell
  for a full session (focus, resize, close).
