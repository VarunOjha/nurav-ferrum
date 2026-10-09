---
id: risk-r11
type: risk
title: "Evergreen WebView2, Edge and Chrome auto-update and change versions mid-study"
status: open
updated: 2026-10-08
sources:
  - raw/research/measurement-methodology.md
  - raw/01-scoping-decisions.md
related: [phase-p6-benchmark-harness, phase-p7-lifecycle, phase-p8-research-paper, adr-0009, comp-benchmark-harness, comp-webview2-runtime, exp-baseline-footprint, exp-startup, exp-lifecycle-policies, risk-r12, risk-r21]
approvable: true
tags: [reproducibility, versions, benchmark]
likelihood: 4
impact: 4
mitigation: "Record four-part versions of Chrome, Edge and the WebView2 runtime on every trial; abort and flag a campaign if any version changes; run campaigns in short windows with updates paused; use Chrome for Testing or branded Chrome with updates blocked (owner choice); offer a WebView2 Fixed Version arm for reproducibility (owner choice); archive the exact installers or runtime used."
spike: null
owner_phase: phase-p6-benchmark-harness
trigger: "Trial metadata shows a version different from the campaign's first trial; an update service runs during a campaign; Edge and WebView2 versions diverge (which changes hard-link page sharing)."
fallback: "Discard every block that spans a version change and re-run it; never pool trials across versions."
unverified:
  - claim: "A policy or service setting reliably blocks Edge and Chrome auto-update for the length of a campaign"
    verify_in: phase-p6-benchmark-harness
  - claim: "Chrome for Testing has resource behaviour equivalent to branded Chrome of the same version"
    verify_in: phase-p6-benchmark-harness
---

# risk-r11: Evergreen WebView2, Edge and Chrome auto-update and change versions mid-study

| Likelihood | Impact | Score | Status | Owner phase |
|---|---|---|---|---|
| 4 | 4 | 16 | open | `phase-p6-benchmark-harness` |

Score = likelihood × impact (SCHEMA §6.5). Scales are planning judgements, not measurements. Full register: [ov-risk-register](ov-risk-register.md).

## Description and evidence

Verified in MM §6.2:
- The Evergreen WebView2 runtime picks up a new version when the app restarts.
- Edge and the Evergreen runtime are **hard-linked** when their versions match, which changes shared-page behaviour (see risk-r05).
- **Chrome for Testing** has no auto-update; whether it performs like branded Chrome is unknown.
- The **WebView2 Fixed Version** runtime does not auto-update and is selected with `browserExecutableFolder`.
- Edge Stable cannot be pinned the same way; how to block its updates during a campaign is unresolved.

The versions observed on 2026-10-08 were WebView2 154.0.4258.62, Edge 154.0.4258.x and Chrome 154.0.8037.x (scoping decisions). Owner questions from MM §10: branded Chrome or Chrome for Testing; Evergreen, Fixed Version or both for Ferrum.

Sources: [measurement-methodology](../raw/research/measurement-methodology.md), [scoping decisions](../raw/01-scoping-decisions.md). Abbreviations: TW = tauri-webview2-capabilities, MM = measurement-methodology, RW = related-work-seed, NX = nextjs-stack, LW = llm-wiki-pattern.

## Early-warning signs (trigger)

Trial metadata shows a version different from the campaign's first trial; an update service runs during a campaign; Edge and WebView2 versions diverge (which changes hard-link page sharing).

## Mitigation

Record four-part versions of Chrome, Edge and the WebView2 runtime on every trial; abort and flag a campaign if any version changes; run campaigns in short windows with updates paused; use Chrome for Testing or branded Chrome with updates blocked (owner choice); offer a WebView2 Fixed Version arm for reproducibility (owner choice); archive the exact installers or runtime used.

## De-risking spike (proposed)

Phase: `phase-p6-benchmark-harness`. Find and document a method that blocks Chrome and Edge updates for the length of a campaign (policies or services), verify it by checking versions before and after a 24-hour idle window, and record the method.

The `spike` frontmatter field stays `null` until the owning phase page assigns a task id (`pN.M`); the integrator or phase owner then sets it here.

## Fallback if realised

Discard every block that spans a version change and re-run it; never pool trials across versions.

## Unverified claims

- A policy or service setting reliably blocks Edge and Chrome auto-update for the length of a campaign. UNVERIFIED[phase-p6-benchmark-harness]
- Chrome for Testing has resource behaviour equivalent to branded Chrome of the same version. UNVERIFIED[phase-p6-benchmark-harness]

## Affects

`phase-p6-benchmark-harness`, `phase-p7-lifecycle`, `phase-p8-research-paper`, `adr-0009`, `comp-benchmark-harness`, `comp-webview2-runtime`, `exp-baseline-footprint`, `exp-startup`, `exp-lifecycle-policies`, `risk-r12`, `risk-r21`
