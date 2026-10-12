---
id: risk-r10
type: risk
title: "Google OAuth refuses sign-in from embedded webviews such as Ferrum tabs"
status: open
updated: 2026-10-11
sources:
  - raw/research/tauri-webview2-capabilities.md
  - raw/00-master-prompt.md
related: [phase-p2-minimal-container, phase-p3-tabs-sessions, phase-p6-benchmark-harness, comp-webview-manager, comp-security-engine, adr-0015, adr-0004]
approvable: true
tags: [oauth, usability, policy, workloads]
likelihood: 4
impact: 3
mitigation: "Never circumvent (no user-agent spoofing); detect Google OAuth flows and offer 'open in system browser'; document the limitation for users; design benchmark workloads so none needs a Google login."
spike: null
owner_phase: phase-p2-minimal-container
trigger: "Users report Google sign-in failing in a tab; a chosen public real-world workload turns out to require Google sign-in."
fallback: "Accept the limitation and document it; keep authenticated Google sites out of scope for both the app and the benchmarks."
unverified:
  - claim: "Other OAuth providers (for example Microsoft or GitHub) impose similar embedded-webview restrictions"
    verify_in: phase-p3-tabs-sessions
---

# risk-r10: Google OAuth refuses sign-in from embedded webviews such as Ferrum tabs

| Likelihood | Impact | Score | Status | Owner phase |
|---|---|---|---|---|
| 4 | 3 | 12 | open | `phase-p2-minimal-container` |

Score = likelihood × impact (SCHEMA §6.5). Scales are planning judgements, not measurements. Full register: [ov-risk-register](ov-risk-register.md).

## Description and evidence

Google's OAuth policy (TW §8, verified) says a developer must not direct a Google OAuth 2.0 authorization request to an embedded user-agent under the developer's control, and embedded user-agents include libraries that let a developer insert scripts, alter routing or access session cookies. Ferrum tabs do all three. The master prompt (§5 Phase 1) forbids bypassing OAuth provider restrictions on embedded browsers.

Consequences:
- Usability: Google sign-in in a Ferrum tab should be expected to fail. This weakens the "usable app" half of adr-0004.
- Research: authentication-state equivalence across Chrome, Edge and Ferrum (master prompt §8) is impossible for Google-authenticated sites, so workloads must avoid them.

Sources: [tauri-webview2-capabilities](../raw/research/tauri-webview2-capabilities.md), [master prompt](../raw/00-master-prompt.md). Abbreviations: TW = tauri-webview2-capabilities, MM = measurement-methodology, RW = related-work-seed, NX = nextjs-stack, LW = llm-wiki-pattern.

## Early-warning signs (trigger)

Users report Google sign-in failing in a tab; a chosen public real-world workload turns out to require Google sign-in.

## Mitigation

Never circumvent (no user-agent spoofing); detect Google OAuth flows and offer 'open in system browser'; document the limitation for users; design benchmark workloads so none needs a Google login.

## De-risking spike (proposed)

Phase: `phase-p2-minimal-container`. Observe only, never circumvent: open the Google sign-in page in a Ferrum tab and record what happens (screenshot plus URL), then confirm the "open in system browser" path launches the default browser with the same URL.

The `spike` frontmatter field stays `null` until the owning phase page assigns a task id (`pN.M`); the integrator or phase owner then sets it here.

## Fallback if realised

Accept the limitation and document it; keep authenticated Google sites out of scope for both the app and the benchmarks.

## Unverified claims

- Whether Google would block sign-in in a Ferrum view was not observed, by design: since P2 Ferrum never loads Google's sign-in address and offers the normal browser instead ([check-p2.13](../raw/evidence/phase-p2-minimal-container/check-p2.13.txt)), so the design no longer depends on it.
- Other OAuth providers (for example Microsoft or GitHub) impose similar embedded-webview restrictions. UNVERIFIED[phase-p3-tabs-sessions]

## Affects

`phase-p2-minimal-container`, `phase-p3-tabs-sessions`, `phase-p6-benchmark-harness`, `comp-webview-manager`, `comp-security-engine`, `adr-0015`, `adr-0004`
