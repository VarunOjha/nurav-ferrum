---
id: risk-r23
type: risk
title: "Lifecycle discard or suspend causes user data loss or breaks an active operation"
status: open
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/research/related-work-seed.md
  - raw/research/tauri-webview2-capabilities.md
related: [phase-p7-lifecycle, comp-resource-manager, comp-webview-manager, exp-lifecycle-policies, exp-reliability, risk-r03, risk-r17, qual-testing-strategy]
approvable: true
tags: [lifecycle, safety, data-loss, usability]
likelihood: 3
impact: 5
mitigation: "Default to conservative exemptions (audio or video playing, active downloads, camera, microphone or screen capture, user exclusions, pages with unsaved input), prefer sleep over discard, keep the adaptive policy behind a feature flag that is off by default, and gate P7 on safety fixture tests for each exemption."
spike: null
owner_phase: phase-p7-lifecycle
trigger: "A safety fixture loses typed text, interrupts a download or stops media after a transition; users report reloads that lose state."
fallback: "Restrict automatic lifecycle actions to sleep only, or to tabs the user explicitly marks, until the exemptions are reliable."
unverified:
  - claim: "Ferrum can detect pages with unsaved form input from the host (for example via an injected script or beforeunload state)"
    verify_in: phase-p7-lifecycle
---

# risk-r23: Lifecycle discard or suspend causes user data loss or breaks an active operation

| Likelihood | Impact | Score | Status | Owner phase |
|---|---|---|---|---|
| 3 | 5 | 15 | open | `phase-p7-lifecycle` |

Score = likelihood × impact (SCHEMA §6.5). Scales are planning judgements, not measurements. Full register: [ov-risk-register](ov-risk-register.md).

## Description and evidence

The master prompt (§5 Phase 4) says never to discard a session during a potentially destructive operation without an explicit safety mechanism, and lists inputs including media playback, active downloads, user exclusions and unsaved form risk. Sources:

- Chrome's freezing exemption list (RW A3: calls and capture, external-device APIs, Web Locks and IndexedDB) is a vetted starting checklist.
- The Page Lifecycle API (RW A2) lets pages detect discards via `document.wasDiscarded` and recommends saving state on hide.
- WebView2 suspend is best effort and auto-resumes on some calls (TW §6).

Detecting unsaved form input reliably from outside the page is an open problem for Ferrum.

Sources: [master prompt](../raw/00-master-prompt.md), [related-work-seed](../raw/research/related-work-seed.md), [tauri-webview2-capabilities](../raw/research/tauri-webview2-capabilities.md). Abbreviations: TW = tauri-webview2-capabilities, MM = measurement-methodology, RW = related-work-seed, NX = nextjs-stack, LW = llm-wiki-pattern.

## Early-warning signs (trigger)

A safety fixture loses typed text, interrupts a download or stops media after a transition; users report reloads that lose state.

## Mitigation

Default to conservative exemptions (audio or video playing, active downloads, camera, microphone or screen capture, user exclusions, pages with unsaved input), prefer sleep over discard, keep the adaptive policy behind a feature flag that is off by default, and gate P7 on safety fixture tests for each exemption.

## De-risking spike (proposed)

Phase: `phase-p7-lifecycle` (first task). Build the safety fixtures (form with typed text, active download, playing audio, a page holding a Web Lock) and check what signals Ferrum can observe for each before writing any policy.

The `spike` frontmatter field stays `null` until the owning phase page assigns a task id (`pN.M`); the integrator or phase owner then sets it here.

## Fallback if realised

Restrict automatic lifecycle actions to sleep only, or to tabs the user explicitly marks, until the exemptions are reliable.

## Unverified claims

- Ferrum can detect pages with unsaved form input from the host (for example via an injected script or beforeunload state). UNVERIFIED[phase-p7-lifecycle]

## Affects

`phase-p7-lifecycle`, `comp-resource-manager`, `comp-webview-manager`, `exp-lifecycle-policies`, `exp-reliability`, `risk-r03`, `risk-r17`, `qual-testing-strategy`
