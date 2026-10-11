---
id: risk-r18
type: risk
title: "Bugs in unsafe raw-COM code (memory safety, handler leaks, re-entrancy)"
status: open
updated: 2026-10-11
sources:
  - raw/research/tauri-webview2-capabilities.md
  - raw/00-master-prompt.md
related: [phase-p1-foundation, phase-p4-security, phase-p5-telemetry, phase-p7-lifecycle, comp-webview-manager, comp-resource-manager, comp-network-logger, comp-security-engine, risk-r03, risk-r07, risk-r08, qual-testing-strategy, qual-definition-of-done]
approvable: true
tags: [unsafe, com, rust, quality]
likelihood: 3
impact: 4
mitigation: "Confine raw COM to one module per crate behind a safe API; document every unsafe block and keep an Unsafe invariants section on the component page; tie event-handler registrations to RAII tokens that unregister on drop; never block inside COM completions; add create/destroy leak tests and crash-injection tests; review every unsafe diff against a checklist."
spike: null
owner_phase: phase-p1-foundation
trigger: "Webview processes or private commit keep growing over create/destroy cycles; crashes or hangs inside COM callbacks; a closed tab's handlers still fire."
fallback: "Reduce raw COM use to the minimum feature set and drop features (for example sleep, iframe interception) whose COM code cannot be made reliable, recording the gap."
unverified: []
---

# risk-r18: Bugs in unsafe raw-COM code (memory safety, handler leaks, re-entrancy)

| Likelihood | Impact | Score | Status | Owner phase |
|---|---|---|---|---|
| 3 | 4 | 12 | open | `phase-p1-foundation` |

Score = likelihood × impact (SCHEMA §6.5). Scales are planning judgements, not measurements. Full register: [ov-risk-register](ov-risk-register.md).

## Description and evidence

Several Ferrum features need raw COM through `with_webview`: lifecycle (risk-r03), iframe and external-scheme interception (risk-r07), network logging (risk-r08), crash detection (`ProcessFailed`) and possibly profiles (risk-r01 route c). Verified (TW §5):

- Every `webview2-com` call is `unsafe`.
- Event handlers registered via raw COM must be removed, or the controller closed, or reference cycles keep WebViews alive.
- Async COM completions on the UI thread must not block (re-entrancy); wry already uses a dispatch handler for this.

The master prompt (§15) forbids unsafe Rust without documenting the need and its invariants. SCHEMA §6.2 requires `## Unsafe invariants` on any component page with `unsafe_code: true`.

Sources: [tauri-webview2-capabilities](../raw/research/tauri-webview2-capabilities.md), [master prompt](../raw/00-master-prompt.md). Abbreviations: TW = tauri-webview2-capabilities, MM = measurement-methodology, RW = related-work-seed, NX = nextjs-stack, LW = llm-wiki-pattern.

## Early-warning signs (trigger)

Webview processes or private commit keep growing over create/destroy cycles; crashes or hangs inside COM callbacks; a closed tab's handlers still fire.

## Mitigation

Confine raw COM to one module per crate behind a safe API; document every unsafe block and keep an Unsafe invariants section on the component page; tie event-handler registrations to RAII tokens that unregister on drop; never block inside COM completions; add create/destroy leak tests and crash-injection tests; review every unsafe diff against a checklist.

## De-risking spike (proposed)

Phase: `phase-p1-foundation`. As part of the risk-r03 spike, register and unregister a `ProcessFailed` handler through an RAII token, then create and destroy a child webview in a loop and confirm the process count returns to its starting value.

The `spike` frontmatter field stays `null` until the owning phase page assigns a task id (`pN.M`); the integrator or phase owner then sets it here.

## Fallback if realised

Reduce raw COM use to the minimum feature set and drop features (for example sleep, iframe interception) whose COM code cannot be made reliable, recording the gap.

## Unverified claims

- The rustc lint unsafe_op_in_unsafe_fn and the clippy lint undocumented_unsafe_blocks are available on the pinned toolchain and can be denied: checked in P1 on Rust 1.99.0 ([claim checks](../raw/evidence/phase-p1-foundation/p1-claim-checks.txt) §1).

## Affects

`phase-p1-foundation`, `phase-p4-security`, `phase-p5-telemetry`, `phase-p7-lifecycle`, `comp-webview-manager`, `comp-resource-manager`, `comp-network-logger`, `comp-security-engine`, `risk-r03`, `risk-r07`, `risk-r08`, `qual-testing-strategy`, `qual-definition-of-done`
