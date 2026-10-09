---
id: risk-r07
type: risk
title: "Tauri's navigation hook fails open on unparseable URLs and never sees iframe navigations"
status: open
updated: 2026-10-08
sources:
  - raw/research/tauri-webview2-capabilities.md
  - raw/00-master-prompt.md
related: [phase-p4-security, phase-p2-minimal-container, comp-security-engine, comp-webview-manager, adr-0015, exp-security-overhead, risk-r19, qual-security-testing-plan]
approvable: true
tags: [security, navigation, fail-open]
likelihood: 4
impact: 4
mitigation: "Make comp-security-engine fail closed: evaluate the raw URL string itself and deny anything that does not parse; register NavigationStarting and FrameNavigationStarting via raw COM for main-frame and iframe coverage; always install explicit on_new_window and on_download handlers; cover malformed URLs and redirects with property tests and fixture tests."
spike: null
owner_phase: phase-p4-security
trigger: "Any test in which an unparseable or blocklisted URL completes a navigation; an iframe from a blocklisted host loads; a popup or download proceeds without a policy decision being logged."
fallback: "Add request-level blocking via a web resource request filter covering all request source kinds, and document any navigation class that still cannot be intercepted."
unverified:
  - claim: "A raw-COM FrameNavigationStarting handler can cancel cross-origin iframe navigations in a Tauri child webview"
    verify_in: phase-p4-security
  - claim: "A web resource request filter with all request source kinds can block navigations that the navigation hooks miss"
    verify_in: phase-p4-security
---

# risk-r07: Tauri's navigation hook fails open on unparseable URLs and never sees iframe navigations

| Likelihood | Impact | Score | Status | Owner phase |
|---|---|---|---|---|
| 4 | 4 | 16 | open | `phase-p4-security` |

Score = likelihood × impact (SCHEMA §6.5). Scales are planning judgements, not measurements. Full register: [ov-risk-register](ov-risk-register.md).

## Description and evidence

The owner chose open browsing with a blocklist, HTTP upgraded or warned, and confirmation for non-web schemes (adr-0015, Q12). The master prompt (§5 Phase 3, §11) requires navigation policy enforcement, redirect-bypass tests and malformed-URL tests. Verified behaviour of the hooks Tauri provides (TW §4, §10 item 4):

- `on_navigation` maps to WebView2 `NavigationStarting` for the **main frame only**. If the URL **fails to parse, tauri-runtime-wry returns allow**. There is no iframe hook (`FrameNavigationStarting` exists only via raw COM).
- `NavigationStarting` fires for redirects, not for fragment or `pushState` changes.
- `on_new_window`: with no handler set, wry marks popups handled, so they are silently suppressed.
- `on_download`: the wry default allows downloads when the app sets no handler.
- External URI schemes are reachable only via raw COM `LaunchingExternalUriScheme`.

So the security engine cannot rely on `on_navigation` alone.

Sources: [tauri-webview2-capabilities](../raw/research/tauri-webview2-capabilities.md), [master prompt](../raw/00-master-prompt.md). Abbreviations: TW = tauri-webview2-capabilities, MM = measurement-methodology, RW = related-work-seed, NX = nextjs-stack, LW = llm-wiki-pattern.

## Early-warning signs (trigger)

Any test in which an unparseable or blocklisted URL completes a navigation; an iframe from a blocklisted host loads; a popup or download proceeds without a policy decision being logged.

## Mitigation

Make comp-security-engine fail closed: evaluate the raw URL string itself and deny anything that does not parse; register NavigationStarting and FrameNavigationStarting via raw COM for main-frame and iframe coverage; always install explicit on_new_window and on_download handlers; cover malformed URLs and redirects with property tests and fixture tests.

## De-risking spike (proposed)

Phase: `phase-p4-security` (first task), with a smoke test in `phase-p2-minimal-container`.
1. Feed `on_navigation` a set of malformed URLs (see the malformed-URL fixture set in qual-security-testing-plan) and record which ones are allowed.
2. Register `FrameNavigationStarting` via raw COM on a tab and confirm it fires for a cross-origin iframe in a local fixture.
3. Confirm the cancel path (`SetCancel(true)`) works from the raw-COM handler.

The `spike` frontmatter field stays `null` until the owning phase page assigns a task id (`pN.M`); the integrator or phase owner then sets it here.

## Fallback if realised

Add request-level blocking via a web resource request filter covering all request source kinds, and document any navigation class that still cannot be intercepted.

## Unverified claims

- A raw-COM FrameNavigationStarting handler can cancel cross-origin iframe navigations in a Tauri child webview. UNVERIFIED[phase-p4-security]
- A web resource request filter with all request source kinds can block navigations that the navigation hooks miss. UNVERIFIED[phase-p4-security]

## Affects

`phase-p4-security`, `phase-p2-minimal-container`, `comp-security-engine`, `comp-webview-manager`, `adr-0015`, `exp-security-overhead`, `risk-r19`, `qual-security-testing-plan`
