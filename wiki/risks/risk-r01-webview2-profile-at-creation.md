---
id: risk-r01
type: risk
title: "WebView2 profile can only be chosen at controller creation and Tauri 2.12.1 does not expose it"
status: open
updated: 2026-10-08
sources:
  - raw/research/tauri-webview2-capabilities.md
  - raw/01-scoping-decisions.md
  - raw/research/measurement-methodology.md
related: [phase-p1-foundation, phase-p3-tabs-sessions, phase-p4-security, adr-0010, adr-0007, comp-webview-manager, comp-security-engine, comp-webview2-runtime, exp-isolation-overhead, risk-r02, risk-r09, qual-security-testing-plan]
approvable: true
tags: [webview2, tauri, isolation, profiles]
likelihood: 4
impact: 4
mitigation: "Settle the profile route with an owner ADR before the P3 entry gate. Spike two routes in P1 (patch tauri-runtime-wry to the PR 16054 branch; create tab controllers with raw COM and ProfileName) and verify isolation with a cookie/storage fixture plus a shared browser PID check."
spike: p1.6
owner_phase: phase-p1-foundation
trigger: "Tauri PR 16054 is still unmerged when P3 is about to start; the patched build fails to compile; controller creation returns ERROR_INVALID_STATE; the isolation fixture shows cookies leaking between profiles."
fallback: "Per-site data_directory (works today but starts one browser process per site, which contradicts the shared-browser-process part of adr-0010 and needs a superseding ADR), or a single shared profile with per-site InPrivate controllers for sites that need separation."
unverified:
  - claim: "No WebView2 API changes the profile of an already-created controller (absence found only by not finding one)"
    verify_in: phase-p1-foundation
  - claim: "Patching tauri-runtime-wry to the PR 16054 branch compiles against tauri 2.12.1"
    verify_in: phase-p1-foundation
  - claim: "Raw-COM controllers in a child HWND coexist with Tauri child webviews in one window"
    verify_in: phase-p1-foundation
---

# risk-r01: WebView2 profile can only be chosen at controller creation and Tauri 2.12.1 does not expose it

| Likelihood | Impact | Score | Status | Owner phase |
|---|---|---|---|---|
| 4 | 4 | 16 | open | `phase-p1-foundation` |

Score = likelihood × impact (SCHEMA §6.5). Scales are planning judgements, not measurements. Full register: [ov-risk-register](ov-risk-register.md).

## Description and evidence

The owner chose per-site **WebView2 profiles in one shared browser process** for isolation (adr-0010, Q7 in the scoping decisions). WebView2 sets a profile through `ICoreWebView2ControllerOptions::put_ProfileName` **only when the controller is created**. wry 0.57.0 supports it (`with_profile_name`, wry PR #1738, merged). Tauri 2.12.1 does **not** pass a profile name through, and `data_store_identifier` is ignored on Windows. Tauri PR #16054, which would map `data_store_identifier` to a WebView2 profile name, was open on 2026-10-08. Source: TW §6 (Profiles) and §10 item 1.

Four routes exist (TW §6):

| Route | Works today? | Cost |
|---|---|---|
| (a) Wait for #16054 to ship in a 2.x release | No | Schedule depends on upstream |
| (b) `[patch.crates-io]` tauri-runtime-wry to the PR branch | Probably (not compiled) | Supply-chain and maintenance cost of a patched dependency |
| (c) Create tab controllers ourselves with `webview2-com` in child HWNDs, Tauri for the shell only | Probably (not compiled) | Lose Tauri tab hooks; Ferrum owns all the unsafe COM (see risk-r18) |
| (d) Per-site `data_directory` | Yes | Separate browser process per site; contradicts adr-0010 |

A measurement consequence (MM §2.2, §9 item 3): profiles share one process group, so per-profile memory cannot be attributed by PID. That feeds risk-r05 and `exp-isolation-overhead`.

Sources: [tauri-webview2-capabilities](../raw/research/tauri-webview2-capabilities.md), [scoping decisions](../raw/01-scoping-decisions.md), [measurement-methodology](../raw/research/measurement-methodology.md). Abbreviations: TW = tauri-webview2-capabilities, MM = measurement-methodology, RW = related-work-seed, NX = nextjs-stack, LW = llm-wiki-pattern.

## Early-warning signs (trigger)

Tauri PR 16054 is still unmerged when P3 is about to start; the patched build fails to compile; controller creation returns ERROR_INVALID_STATE; the isolation fixture shows cookies leaking between profiles.

## Mitigation

Settle the profile route with an owner ADR before the P3 entry gate. Spike two routes in P1 (patch tauri-runtime-wry to the PR 16054 branch; create tab controllers with raw COM and ProfileName) and verify isolation with a cookie/storage fixture plus a shared browser PID check.

## De-risking spike (proposed)

Phase: `phase-p1-foundation` (task id to be assigned on the phase page).
1. Minimal Tauri 2.12.1 app with the `unstable` feature, one shell webview and two child webviews.
2. Route (b): add the PR #16054 branch as a `[patch.crates-io]` override; set different `data_store_identifier`s on the two tabs.
3. Route (c): in the same window, create one controller via `CreateCoreWebView2ControllerWithOptions` with `ProfileName` set, inside a child HWND.
4. For each route: load a local fixture that writes a cookie and `localStorage` in tab A; read them in tab B at the same origin. Pass = not visible in B. Record both tabs' `BrowserProcessId` and check they are equal (shared browser process).
5. Save build logs and fixture output as P1 evidence and write the route recommendation into an ADR proposal.

Assigned by the integration pass (2026-10-08): task `p1.6`, phase-p1-foundation spike S2 (profiles).

## Fallback if realised

Per-site data_directory (works today but starts one browser process per site, which contradicts the shared-browser-process part of adr-0010 and needs a superseding ADR), or a single shared profile with per-site InPrivate controllers for sites that need separation.

## Unverified claims

- No WebView2 API changes the profile of an already-created controller (absence found only by not finding one). UNVERIFIED[phase-p1-foundation]
- Patching tauri-runtime-wry to the PR 16054 branch compiles against tauri 2.12.1. UNVERIFIED[phase-p1-foundation]
- Raw-COM controllers in a child HWND coexist with Tauri child webviews in one window. UNVERIFIED[phase-p1-foundation]

## Affects

`phase-p1-foundation`, `phase-p3-tabs-sessions`, `phase-p4-security`, `adr-0010`, `adr-0007`, `comp-webview-manager`, `comp-security-engine`, `comp-webview2-runtime`, `exp-isolation-overhead`, `risk-r02`, `risk-r09`, `qual-security-testing-plan`
