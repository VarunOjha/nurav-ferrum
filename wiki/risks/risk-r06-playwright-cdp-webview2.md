---
id: risk-r06
type: risk
title: "Playwright over CDP to WebView2 has partial, lower-fidelity support"
status: mitigating
updated: 2026-10-11
sources:
  - raw/evidence/phase-p1-foundation/spike-s4-playwright-cdp.md
  - raw/research/tauri-webview2-capabilities.md
  - raw/research/measurement-methodology.md
  - raw/01-scoping-decisions.md
related: [phase-p5-telemetry, phase-p6-benchmark-harness, adr-0012, comp-benchmark-harness, comp-baseline-app, exp-navigation, exp-rendering, exp-startup, risk-r09, risk-r14, risk-r19, adr-0031]
approvable: true
tags: [playwright, cdp, benchmark, automation]
likelihood: 4
impact: 3
mitigation: "Drive Chrome, Edge, the Tauri baseline and Ferrum through the same connectOverCDP path; use Playwright only to drive workloads and read in-page timings while the Rust orchestrator measures resources via Win32; pilot the overhead of the debug port and an attached CDP client with an A/A design; enable the debug port only in benchmark builds and never point automation at the shell webview."
spike: p1.8
owner_phase: phase-p6-benchmark-harness
trigger: "Playwright cannot find a tab's page among CDP targets; API calls used by a workload fail only on WebView2; the debug-port pilot shows a difference larger than the A/A noise floor."
fallback: "Drive Ferrum tabs through in-process CDP (CallDevToolsProtocolMethod via raw COM) or a test-only automation hook, and report the asymmetry as a threat to validity."
unverified:
  - claim: "Opening --remote-debugging-port or attaching a CDP client changes resource use by less than the A/A noise floor"
    verify_in: phase-p6-benchmark-harness
---

# risk-r06: Playwright over CDP to WebView2 has partial, lower-fidelity support

| Likelihood | Impact | Score | Status | Owner phase |
|---|---|---|---|---|
| 4 | 3 | 12 | open | `phase-p6-benchmark-harness` |

Score = likelihood × impact (SCHEMA §6.5). Scales are planning judgements, not measurements. Full register: [ov-risk-register](ov-risk-register.md).

## Description and evidence

The owner chose a Rust orchestrator invoking Node/TypeScript Playwright scripts (adr-0012, Q9/Q10). For WebView2, Playwright's documented route is `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=<port>` plus `chromium.connectOverCDP(...)` (TW §7, MM §4.2). Verified constraints:

- Playwright documents `connectOverCDP` as "significantly lower fidelity than the Playwright protocol connection"; it is Chromium-only.
- Microsoft says browser flags are for development and testing, not production apps.
- Flags set through the environment or registry are **ignored for elevated apps** (conflicts with an elevated energy sampler; see risk-r04).
- Parallel runs need distinct user data folders and ports.
- All webviews on one user data folder need identical environment options, so the debug port applies to the shell and every tab together (risk-r09).
- An open debug port exposes every webview, including the trusted shell, to any local process (security note, risk-r19).

For fairness (MM §4.2), Chrome and Edge should be driven through the same CDP path, unless a pilot shows the port costs nothing. How several child webviews appear as CDP targets is unknown.

Sources: [tauri-webview2-capabilities](../raw/research/tauri-webview2-capabilities.md), [measurement-methodology](../raw/research/measurement-methodology.md), [scoping decisions](../raw/01-scoping-decisions.md). Abbreviations: TW = tauri-webview2-capabilities, MM = measurement-methodology, RW = related-work-seed, NX = nextjs-stack, LW = llm-wiki-pattern.

## Early-warning signs (trigger)

Playwright cannot find a tab's page among CDP targets; API calls used by a workload fail only on WebView2; the debug-port pilot shows a difference larger than the A/A noise floor.

## Mitigation

Drive Chrome, Edge, the Tauri baseline and Ferrum through the same connectOverCDP path; use Playwright only to drive workloads and read in-page timings while the Rust orchestrator measures resources via Win32; pilot the overhead of the debug port and an attached CDP client with an A/A design; enable the debug port only in benchmark builds and never point automation at the shell webview.

## De-risking spike (proposed)

Phase: `phase-p6-benchmark-harness` (early), with a first look in `phase-p5-telemetry`.
1. Start Ferrum with the env var and three tabs; list `browser.contexts()` and pages; map each to a tab.
2. Run a trivial workload (navigate, read Paint Timing) on Chrome, Edge, the baseline app and Ferrum through `connectOverCDP`.
3. A/A pilot: the same product with and without the debug port and with and without an attached client; compare with the harness noise floor.

Assigned by the integration pass (2026-10-08): task `p1.8`, phase-p1-foundation spike S4 (Playwright over CDP).

## Fallback if realised

Drive Ferrum tabs through in-process CDP (CallDevToolsProtocolMethod via raw COM) or a test-only automation hook, and report the asymmetry as a threat to validity.

## Spike result (P1, p1.8, 2026-10-11)

Spike S4 ([report](../raw/evidence/phase-p1-foundation/spike-s4-playwright-cdp.md)) drove spike S1, Chrome for Testing and Edge
with the same `connectOverCDP` code. In S1 the shell and each child web view are separate `page` targets, identifiable by URL
(this settles the earlier P6 question early). Navigation, paint entries, input, screenshots, response events, request routing,
a raw CDP session and goBack worked on all three. On a hidden tab there are no paint entries and screenshots time out, so the
harness measures only the shown tab (adr-0031). The debug-port overhead pilot stays in P6.

## Unverified claims

- Opening --remote-debugging-port or attaching a CDP client changes resource use by less than the A/A noise floor. UNVERIFIED[phase-p6-benchmark-harness]

## Affects

`phase-p5-telemetry`, `phase-p6-benchmark-harness`, `adr-0012`, `comp-benchmark-harness`, `comp-baseline-app`, `exp-navigation`, `exp-rendering`, `exp-startup`, `risk-r09`, `risk-r14`, `risk-r19`
