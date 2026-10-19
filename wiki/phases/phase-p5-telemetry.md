---
id: phase-p5-telemetry
type: phase
title: "P5 Telemetry and network logger (Milestone M4): validated process metrics, timing, metadata-only network log"
status: in-progress
updated: 2026-10-19
sources:
  - raw/owner/2026-10-18-s08-q229-block-requests-fully.md
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/research/measurement-methodology.md
  - raw/research/tauri-webview2-capabilities.md
related: [phase-p4-security, phase-p6-benchmark-harness, comp-telemetry, comp-network-logger, comp-webview-manager, risk-r03, risk-r05, adr-0008, exp-baseline-footprint, exp-startup, exp-navigation]
approvable: true
phase: phase-p5-telemetry
tags: [milestone-m4, telemetry, metrics, network-log, validation]
milestone: M4
order: 5
depends_on: [phase-p4-security]
est_sessions: 5
entry_criteria:
  - "phase-p4-security has status done and key phase-p4-security#exit is APPROVED."
  - "Owner approval recorded and not stale in plan/approvals.json for the P5 dependency set: schema, phase-p5-telemetry, every ADR in decisions, every component in components, exp-baseline-footprint, exp-startup and exp-navigation."
  - "Metric pages for the headline metrics (private commit, CPU time, startup boundaries) exist with status proposed or defined."
  - "Owner has answered the network-log privacy questions (see body) or accepted the defaults."
  - "No open Q-NNN blocks any id in the dependency set."
deliverables:
  - "Telemetry crate: process-set attribution, process metrics sampler, startup and navigation timing, lifecycle transition records."
  - "Versioned export schema (JSONL and CSV) carrying experiment metadata (git sha, OS build, WebView2 runtime, Ferrum version, config id, machine inventory id)."
  - "Validation test suite proving each sampler reports known ground truth within a stated tolerance."
  - "Measured sampler overhead (as harness characterisation, not a research result)."
  - "Network logger: metadata-only JSONL per session folder (URL, method, status, resource type, timing, sizes, tab, policy decision), no headers or bodies."
  - "Settings and UI for telemetry and the network log folder."
tasks:
  - id: p5.1
    title: "Export schema v1 (JSONL + CSV) and run metadata record; schema files committed; writer with atomic file rotation"
    verify: "Unit tests: every record type round-trips; a schema validator (Rust test or Python script) accepts generated files and rejects a corrupted fixture."
  - id: p5.2
    title: "Process-set attribution for Ferrum: own process plus WebView2 processes from GetProcessInfos / GetProcessExtendedInfos on Ferrum's environment; never by executable name (risk-r05)"
    verify: "Integration test runs Ferrum alongside another WebView2 host (the S1 spike app) and asserts the other host's PIDs are excluded and every Ferrum WebView2 PID is included (cross-checked with a process snapshot)."
  - id: p5.3
    title: "Process metrics sampler with direct windows crate calls: PrivateUsage (headline), WorkingSetSize and PrivateWorkingSetSize (secondary), page faults, CPU via GetProcessTimes and QueryProcessCycleTime; summed series over the attributed set; configurable interval"
    verify: "Unit tests on aggregation logic (sum of private commit across the set; peak computed from the summed series, never a sum of per-process peaks)."
  - id: p5.4
    title: "Sampler validation against ground truth: helper program commits and touches a known number of MiB; helper burns CPU on one thread for a known duration; results compared with expected values and with psutil as an independent reader"
    verify: "Validation tests pass within tolerances written in the test before it is run; raw outputs saved as evidence; tolerances and any failure recorded on the metric pages."
  - id: p5.5
    title: "Sampler overhead characterisation: CPU time and private commit of the sampler itself at each supported interval"
    verify: "Raw outputs saved under raw/evidence/phase-p5-telemetry/; telemetry quality page cites them; no comparison claim made."
  - id: p5.6
    title: "Startup timing chain: process creation time, window visible, shell first paint, tab first contentful paint, largest contentful paint; collected from the host through DevTools Protocol calls on the WebView (no IPC from page script)"
    verify: "Integration test on a fixture page asserts every boundary is present and ordered (creation before visible before FCP before LCP); boundary definitions match the metric pages."
  - id: p5.7
    title: "Navigation timing records: navigation start, response, DOMContentLoaded, load, completion; same-origin and cross-origin labels; redirect count"
    verify: "Integration test with the P2 redirect fixtures asserts the redirect count and ordering of timestamps."
  - id: p5.8
    title: "Lifecycle transition record type (from-state, to-state, trigger, timestamp, tab) for P7; recorded for hide/show today"
    verify: "Unit test writes and validates transition records; integration test sees hide/show records when switching tabs."
  - id: p5.9
    title: "Network logger (adr-0008): raw COM WebResourceResponseReceived per tab (or DevTools Network events if spike S3 showed problems) to metadata-only JSONL, one folder per app session, rotation, policy-decision field from P4"
    verify: "Integration test: fixture page with a known set of resources (including one cross-origin iframe and one fetch) produces exactly the expected entries; a negative test asserts no header or body fields exist in any record."
  - id: p5.10
    title: "Network logger overhead pilot and coverage check (iframes, redirects, service-worker fetches documented as covered or not covered)"
    verify: "Coverage table on comp-network-logger cites the test outputs; overhead pilot raw output saved."
  - id: p5.11
    title: "Settings and shell UI: enable or disable telemetry and network log, open log folder, retention limit"
    verify: "Smoke test toggles each setting and asserts files are or are not written."
  - id: p5.12
    title: "Spike-follow-up: confirm how multiple tab WebViews appear as DevTools targets and how renderer processes map to WebViews (inputs for P6 and P7)"
    verify: "Findings written to a raw evidence note and linked from comp-telemetry; affected UNVERIFIED tags resolved or re-targeted."
  - id: p5.13
    title: "Research track: literature batch 5 (measurement methodology, browser benchmarking practice); metric pages move to status defined"
    verify: "New raw research notes; each headline metric page has status defined and cites p5.4 evidence."
  - id: p5.15
    title: "Security follow-up (owner answer Q-229): requests to blocked sites are stopped at the network level, not only the page (typed addresses, links, redirect hops, frames and sub-resources)"
    verify: "Integration test: the fixture server counts no request for a blocked site after typed, link, redirect, frame and sub-resource attempts; allowed sites still load; the request filter's cost is measured and the raw output saved."
  - id: p5.14
    title: "Exit gate and owner M4 review"
    verify: "All evidence files exist; lint clean; owner approves phase-p5-telemetry#exit."
test_gate:
  automated:
    - "cargo fmt --all -- --check"
    - "cargo clippy --workspace --all-targets -- -D warnings"
    - "cargo test --workspace"
    - "cargo deny check"
    - "apps/desktop shell: npm run lint && npm run typecheck && npm run test"
    - "Tauri release build of apps/desktop"
    - "Telemetry validation suite (p5.4) against ground-truth helpers"
    - "Export schema validation (p5.1)"
    - "Network logger integration and negative tests (p5.9)"
    - "Security suite, P3 integration suite, P2 smoke suite (regression)"
    - "cd interactive_plan && npm run lint:wiki"
  manual:
    - "Owner browses normally for a session with the network log on and reviews the log folder for anything that should not be there (privacy check)."
    - "Owner confirms the telemetry and log toggles behave as described."
  evidence:
    - raw/evidence/phase-p5-telemetry/cargo-test.txt
    - raw/evidence/phase-p5-telemetry/cargo-clippy.txt
    - raw/evidence/phase-p5-telemetry/shell-tests.txt
    - raw/evidence/phase-p5-telemetry/release-build.txt
    - raw/evidence/phase-p5-telemetry/cargo-deny.txt
    - raw/evidence/phase-p5-telemetry/validation-suite.txt
    - raw/evidence/phase-p5-telemetry/sampler-overhead.txt
    - raw/evidence/phase-p5-telemetry/schema-validation.txt
    - raw/evidence/phase-p5-telemetry/network-log-tests.txt
    - raw/evidence/phase-p5-telemetry/regression.txt
    - raw/evidence/phase-p5-telemetry/devtools-targets.md
    - raw/evidence/phase-p5-telemetry/wiki-lint.txt
    - raw/evidence/phase-p5-telemetry/manual-checklist.md
exit_criteria:
  - "Every master prompt section 16 Milestone 4 deliverable exists: process metrics collection, startup measurements, navigation measurements, structured CSV/JSON exports, validation tests."
  - "Master prompt section 2 objective 11 (network call logs dumped to a folder) delivered as metadata only per adr-0008."
  - "Every metric used by P6 has a metric page with status defined or validated and a support value backed by evidence."
  - "Owner approved phase-p5-telemetry#exit."
risks: [risk-r03, risk-r05, risk-r08]
decisions: [adr-0008, adr-0012, adr-0014]
experiments: [exp-baseline-footprint, exp-startup, exp-navigation]
components: [comp-telemetry, comp-network-logger, comp-webview-manager]
unverified: []
---

# P5 Telemetry and network logger (Milestone M4)

P5 builds the measurement layer and, more importantly, proves it measures what it claims. It covers master prompt section 4 "Telemetry Engine", section 16 "Milestone 4" and objective 11 (network call logs) ([raw/00-master-prompt.md](../raw/00-master-prompt.md)), with the owner's Q5 choice of metadata-only JSONL ([raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md), adr-0008).

## Scope

Method choices come from [raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md):

- **Headline memory metric is private commit (`PrivateUsage`)** summed over exactly Ferrum's processes. Working set double-counts shared pages when summed and is secondary only (section 1). Peaks come from the summed series, never from adding per-process peaks.
- **Attribution by identity, never by executable name** (section 2). Other WebView2 hosts on the machine would otherwise be counted. WebView2 renderers are shared across WebViews in one user data folder, so per-tab memory is not well defined; the telemetry records process-level data and says so.
- **Direct `windows` crate calls**, not `sysinfo`, whose `memory()` returns the double-counting working set (section 8).
- **Startup boundaries** use creation, window visible, FCP, LCP. "Time to interactive" is retired upstream (section 4), so the master prompt's "time to interactive state" is mapped to a responsiveness metric defined on the metric pages.
- **Network log** uses raw COM `WebResourceResponseReceived` or DevTools `Network.*` events, because Tauri has no response hook for https tabs ([raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md) section 6).

Rigorous testing here means ground truth: p5.4 builds helper programs whose memory and CPU use are known by construction and checks the sampler against them, with tolerances fixed before the run. A sampler that fails validation blocks P6.

## Network-log privacy questions (owner, before P5)

Answered by the owner on 2026-10-18 (Q-114, [raw/owner/2026-10-18-s08-p5-questions.md](../raw/owner/2026-10-18-s08-p5-questions.md)):

1. Full URLs are kept in the local log, query strings included.
2. The network log is off by default and switched on in settings; benchmark runs switch it on themselves.
3. Log files older than 14 days are deleted (changeable in settings).

Q-115 (startup chain without time to interactive) and Q-203 (all raw run data in git under `raw/bench/<run-id>/`) were answered the same day.

## Out of scope

- Running browsers other than Ferrum (P6).
- Energy measurement (P6, adr-0009).
- Any comparative or "improvement" statement. p5.4 and p5.5 outputs characterise the tool, not Ferrum.

## Step order

```mermaid
flowchart LR
  p5_1["p5.1 export schema"] --> p5_3["p5.3 sampler"]
  p5_2["p5.2 attribution"] --> p5_3
  p5_3 --> p5_4["p5.4 ground-truth validation"]
  p5_4 --> p5_5["p5.5 sampler overhead"]
  p5_1 --> p5_6["p5.6 startup chain"]
  p5_1 --> p5_7["p5.7 navigation timing"]
  p5_1 --> p5_8["p5.8 transition records"]
  p5_1 --> p5_9["p5.9 network logger"]
  p5_9 --> p5_10["p5.10 coverage + overhead pilot"]
  p5_9 --> p5_11["p5.11 settings UI"]
  p5_6 --> p5_12["p5.12 targets + renderer mapping"]
  p5_5 --> p5_14["p5.14 exit review"]
  p5_7 --> p5_14
  p5_8 --> p5_14
  p5_10 --> p5_14
  p5_11 --> p5_14
  p5_12 --> p5_14
  p5_13["p5.13 literature batch 5"] --> p5_14
  p5_9 --> p5_15["p5.15 block requests to blocked sites (Q-229)"]
  p5_15 --> p5_14
```

## Checkpoints and interruption recovery

- Validation tolerances are committed before the validation run (p5.4) so that a resumed session cannot loosen them after seeing results. Any later change is logged with a reason.
- Raw validation outputs go to `raw/evidence/phase-p5-telemetry/` immediately after each run, so nothing depends on terminal scrollback.

## Open points settled at the exit review (p5.14)

The four points this page listed as unverified were answered during P5:

- `PrivateWorkingSetSize` (`PROCESS_MEMORY_COUNTERS_EX2`) is filled on this PC ([check-p5.3](../raw/evidence/phase-p5-telemetry/check-p5.3.txt)).
- First and largest contentful paint are read from the host through DevTools calls in an isolated world of the page
  ([check-p5.6](../raw/evidence/phase-p5-telemetry/check-p5.6.txt)).
- `GetProcessExtendedInfos` reports the frames each renderer draws, so a tab's renderer, and its other-site frames',
  are found by address ([devtools-targets-p5.12-note](../raw/evidence/phase-p5-telemetry/devtools-targets-p5.12-note.md)).
- `WebResourceResponseReceived` reports responses of an other-site iframe and requests a service worker answers or
  passes on, but not the worker's own script or requests, nor requests that get no response
  ([netlog-coverage-p5.10.json](../raw/evidence/phase-p5-telemetry/netlog-coverage-p5.10.json)).

The other P5-targeted points on other pages were answered or moved to a later phase, each with its reason, in the
same review (log entry of p5.14).

## Owner review checkpoint (adr-0014)

The owner reviews the validation evidence and the network-log privacy check, then approves `phase-p5-telemetry#exit`.
