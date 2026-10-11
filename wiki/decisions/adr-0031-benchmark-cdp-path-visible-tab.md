---
id: adr-0031
type: decision
title: "Benchmarks drive Ferrum, Chrome and Edge through the same Playwright CDP path, on the visible tab only"
status: proposed
updated: 2026-10-11
sources:
  - raw/evidence/phase-p1-foundation/spike-s4-playwright-cdp.md
  - raw/evidence/phase-p1-foundation/spike-s4/results.json
  - raw/evidence/phase-p1-foundation/spike-s1/job-4.job.json
  - raw/research/tauri-webview2-capabilities.md
  - raw/research/measurement-methodology.md
related: [adr-0012, adr-0009, adr-0029, risk-r05, risk-r06, risk-r13, risk-r14, phase-p1-foundation, phase-p5-telemetry, phase-p6-benchmark-harness, comp-benchmark-harness]
approvable: true
date: 2026-10-11
decided_by: claude-proposed
supersedes: []
options:
  - "One Node/TypeScript Playwright harness over CDP for all products (debug port via WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS for Ferrum)"
  - "Ferrum-specific instrumentation inside the app, CDP only for Chrome and Edge"
phase: phase-p1-foundation
tags: [benchmarks, playwright, cdp, fairness]
---

# ADR-0031: Benchmarks drive every product through the same Playwright CDP path, on the visible tab only

## Context

adr-0012 chose a Rust orchestrator with Node/TypeScript Playwright scripts. Whether Playwright can drive a WebView2 app with
several child web views the same way as Chrome and Edge was risk-r06. Spike S4 (p1.8) ran one script against spike S1,
Chrome for Testing 155.0.8059.39 and Edge 155.0.4283.45 over `connectOverCDP`
([spike S4 report](../raw/evidence/phase-p1-foundation/spike-s4-playwright-cdp.md)): attach, target listing, navigation to a
loopback fixture, paint entries and ten feature probes worked on all three. The shell and each child web view are separate
CDP targets, identifiable by URL. On a **hidden** tab there were no paint entries and screenshots timed out, while
`visibilityState` read `visible`. Spike S1's Job Object check showed all WebView2-listed processes, plus a crashpad
handler, join a job around the app ([job-4.job.json](../raw/evidence/phase-p1-foundation/spike-s1/job-4.job.json)), which is
how process attribution can work (risk-r05).

## Options considered

| Option | For | Against |
|---|---|---|
| **Same CDP harness for all** | one code path → fair comparison; spike S4 showed every needed feature | debug port exposes all web views to local processes (benchmark builds only); CDP is lower fidelity than Playwright's own protocol (no failure seen) |
| Ferrum-only in-app instrumentation | richer Ferrum data | different measurement paths for Ferrum and the browsers → a fairness threat (risk-r13, risk-r14) |

## Decision

**Proposed:**

1. One Node/TypeScript Playwright harness drives Ferrum, Chrome and Edge through `connectOverCDP`; this refines adr-0012 and
   does not replace it.
2. Ferrum opens its debug port only in benchmark and debug runs, through
   `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=<port>`, started non-elevated. Chrome and Edge get the same
   flag and a fresh profile. Normal builds never open the port (SECURITY.md).
3. Paint, screenshot and visual measures are taken **only on the shown tab**. The harness does not trust `visibilityState`
   alone to know whether a tab is hidden; it uses Ferrum's own tab state.
4. Process attribution uses a Job Object around each product's launch, cross-checked with WebView2's `GetProcessInfos`
   for Ferrum (the crashpad handler is in the job but not in WebView2's list; it is counted and reported separately).

## Consequences

- Fairness: identical driving code and flags across products; differences come from the products, not the harness.
- Security: the benchmark build carries a debug port; it must never ship or run on a normal profile.
- Elevated energy sampling (if approved, Q-123) runs as a separate process, because WebView2 ignores environment flags for
  elevated apps.

## Verification / evidence

- [spike-s4-playwright-cdp.md](../raw/evidence/phase-p1-foundation/spike-s4-playwright-cdp.md), [results.json](../raw/evidence/phase-p1-foundation/spike-s4/results.json).
- [job-4.job.json](../raw/evidence/phase-p1-foundation/spike-s1/job-4.job.json) (and job-5, job-6).
- To verify in P5/P6: debug-port overhead pilot (research note §7 says equivalence must be shown or applied to all products alike).
