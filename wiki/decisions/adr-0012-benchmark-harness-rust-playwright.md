---
id: adr-0012
type: decision
title: "Benchmark harness = Rust orchestrator + Node/TypeScript Playwright scripts"
status: accepted
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/research/measurement-methodology.md
  - raw/research/tauri-webview2-capabilities.md
related: [adr-0009, adr-0013, adr-0007, adr-0008, risk-r05, risk-r06, risk-r04, phase-p5-telemetry, phase-p6-benchmark-harness, phase-p7-lifecycle, comp-benchmark-harness, comp-baseline-app, comp-telemetry, exp-baseline-footprint, exp-startup, exp-navigation, exp-rendering]
approvable: true
date: 2026-10-08
decided_by: owner
supersedes: []
options:
  - "Rust orchestrator invoking Node/TypeScript Playwright scripts"
  - "Everything in Node/TypeScript (Playwright launches and samples)"
  - "Everything in Python (Playwright for Python + psutil)"
phase: phase-p0-planning
tags: [benchmark, harness, playwright, rust]
unverified:
  - claim: "How multiple child WebViews in one user data folder appear as CDP targets/pages to Playwright connectOverCDP"
    verify_in: phase-p5-telemetry
  - claim: "Attaching a CDP client / --remote-debugging-port changes resource use measurably (A/A overhead pilot)"
    verify_in: phase-p6-benchmark-harness
  - claim: "Chrome and Edge child processes stay inside a harness-owned Job Object (no breakaway)"
    verify_in: phase-p6-benchmark-harness
---

# ADR-0012: The benchmark harness is a Rust orchestrator plus Node/TypeScript Playwright scripts

## Context

The master prompt asks for a harness that launches targets, executes repeatable workloads, collects measurements, validates workload equivalence, repeats experiments and exports raw results ([raw/00-master-prompt.md](../raw/00-master-prompt.md) §4 "Benchmark Harness"). It compares five configurations, A–E, with fairness controls (§8). Playwright is named for browser automation (§3).

The owner's answers ([raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md)):

- Q9: **"Rust orchestrator (trial scheduling, randomization, Windows-API process sampling) invoking Playwright scripts"**;
- Q10: **"Node/TypeScript"** for the Playwright scripts, with analysis remaining in Python ([ADR-0013](adr-0013-statistics-python.md)).

Research findings that shape this decision:

| # | Finding | Status |
|---|---|---|
| 1 | Playwright reaches WebView2 only through `connectOverCDP` after setting `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=…`. Playwright's own docs call `connectOverCDP` "significantly lower fidelity" ([raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md) §7). This confirms `risk-r06` | VERIFIED |
| 2 | **Elevated processes ignore WebView2 flags set by environment variable** (§7). Ferrum must therefore run non-elevated under the harness, and the admin-only energy sampler must be a separate process ([ADR-0009](adr-0009-benchmark-hardware-energy.md)) | VERIFIED |
| 3 | Never attribute processes by executable name. Launch every target **suspended inside a harness-owned Job Object** with a fresh profile/UDF, and cross-check with WebView2 `GetProcessExtendedInfos` (which excludes crashpad) and an ETW trace ([raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md) §2.3). This extends `risk-r05` | VERIFIED APIs, DERIVED method |
| 4 | Headline memory is the summed `PrivateUsage` (private commit) over the attributed set. Summed working set double-counts. `sysinfo::memory()` returns working set, so use direct `windows` 0.62 crate calls (methodology §1, §8) | VERIFIED |
| 5 | For fairness, drive Chrome and Edge through **the same `connectOverCDP` path** as WebView2, so instrumentation overhead is symmetric (methodology §4.2) | DERIVED |
| 6 | All webviews in Ferrum's UDF share environment options, so the debug port applies to the shell and all tabs together (capabilities note §6) | VERIFIED |

## Options considered

| Option | Pros | Cons |
|---|---|---|
| A. **Rust orchestrator + Node/TS Playwright scripts** | Windows-API sampling (Job Objects, `GetProcessMemoryInfo` EX2, `QueryProcessCycleTime`) with precise timing in Rust. Playwright's first-class API is Node. Owner's choice | Two languages and an IPC contract between orchestrator and scripts. Two toolchains to pin |
| B. All Node/TS | One language | Windows process sampling and Job Objects from Node need native addons. Timing jitter from the JS event loop in the sampler |
| C. All Python | One language with the analysis | psutil's `rss` is working set and `vms` is private commit (naming traps, methodology §8). Job Objects need ctypes or pywin32. Not the owner's choice |

## Decision

### Owner decision (verbatim)

As recorded in [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md), scoping answers Q9 and Q10 (that file records the owner's words verbatim-in-substance):

> Q9 Benchmark harness language: **Rust orchestrator** (trial scheduling, randomization, Windows-API process sampling) invoking Playwright scripts  
> Q10 Playwright script language: **Node/TypeScript** (analysis/statistics remain Python)

This quoted choice is what `decided_by: owner` and `status: accepted` cover (SCHEMA §10.4 rule 3(b)).

### Claude elaboration (binding only once this ADR is APPROVED in the plan app)

Everything below in this section is Claude's elaboration of the owner's choice. Under SCHEMA §10.4 it binds implementation only after the owner approves this ADR in the plan app; until then it is a proposal.

**Option A.**

**The Rust orchestrator** (`comp-benchmark-harness`, path per [ADR-0018](adr-0018-repo-root-cargo-workspace.md)):

- schedules trials in randomized blocks;
- creates a Job Object per trial and launches the target **suspended** with a fresh profile/UDF, `--remote-debugging-port=<per-trial port>` (for Ferrum and the baseline via `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`; for Chrome and Edge as a launch flag), then resumes it;
- samples the process set at a fixed interval via the `windows` crate;
- records versions, hardware, window state and policies for every trial;
- writes raw output to `benchmarks/results/<run-id>/`, which is archived to `wiki/raw/bench/<run-id>/`.

**The Node/TS Playwright scripts:**

- connect with `chromium.connectOverCDP(...)`, the **same path for all products**;
- execute the workload steps;
- collect in-page metrics (Paint Timing, LCP, LoAF);
- report step timestamps back to the orchestrator over stdout JSON lines. The exact protocol is defined in P6.

**Shared rules:**

- No product is ever run elevated. The energy sampler is a separate elevated process ([ADR-0009](adr-0009-benchmark-hardware-energy.md)).
- `cfg-tauri-baseline` (`comp-baseline-app`) is a minimal Tauri + WebView2 app launched by the same orchestrator.
- Workloads are served from a local static server for the `synthetic-local` workloads (master prompt §9).

## Consequences

### Positive

- Symmetric instrumentation across all five configurations, and process attribution by identity, not by name.
- The Rust sampler can share code with `comp-telemetry` (P5), which is designed so that P6 can reuse it.

### Negative

- **CDP for every product.** Every product runs with a debugging port and a CDP client attached, which may itself change behaviour. Whether the effect is measurable is UNVERIFIED[phase-p6-benchmark-harness]. An A/A pilot quantifies it. Headline results are labelled "measured with CDP attached".
- **Multi-tab targets.** How Ferrum's multiple child webviews appear as CDP targets is UNVERIFIED[phase-p5-telemetry]. Multi-tab workloads (master prompt §9 items 8–10) may need Ferrum-internal tab control through a test-only command instead. If so, that command must be compiled out of release builds.
- **Job Object containment.** Chrome and Edge may break away from the Job Object (their sandbox uses its own jobs). This is UNVERIFIED[phase-p6-benchmark-harness]. A trial fails if any product-owned PID is found outside the job.
- **Security.** An open debugging port exposes all webviews, the trusted shell included, to local processes. It is for benchmark and debug builds only, and is documented in `SECURITY.md`.

### Follow-ups

- P5: a CDP-targets spike with Ferrum running two tabs.
- P6: A/A test and CDP-overhead pilot before any comparative campaign. Decide the harness protocol (orchestrator ↔ scripts). Pin the Node and Playwright versions.
- Owner questions (the register [ov-open-questions](../overview/ov-open-questions.md) is the only place that states which gate each one holds), with Claude's recommended defaults:
  - **Q-117 (vendor defaults vs matched settings; replaces withdrawn Q-001):** both. As-shipped defaults are the headline comparison; Edge Startup Boost is always disabled for cold-start validity, and this is stated; the matched configuration is a labelled secondary comparison; every feature state is recorded per trial ([raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md) §6.1).
  - **Q-118 (Chrome build; replaces withdrawn Q-002):** branded Chrome and branded Edge, symmetrically, with auto-update paused for a campaign; versions recorded per trial, and the campaign aborts if a version changes. How to pause updates is researched in P6. Chrome for Testing is an optional reproducibility arm ([raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md) §6.2).
  - **Q-119 (WebView2 runtime; replaces withdrawn Q-003):** Evergreen for the headline, version recorded per trial, plus Fixed Version as a labelled configuration with an archived runtime copy ([raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md) §6.2).
  - **Q-115** (replace master prompt §7 "time to interactive" with process start → first window visible → FCP → LCP plus LoAF; [raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md) §4.2) and **Q-120** (public real-world sites for supplementary workloads, master prompt §9). Their gates are stated only in the register.

### Related risks and phases

- Risks: `risk-r05` (attribution), `risk-r06` (CDP fidelity), `risk-r04` (elevated sampler).
- Phases: `phase-p5-telemetry`, `phase-p6-benchmark-harness`, `phase-p7-lifecycle`.

## Verification / evidence

- Owner answers Q9 and Q10: [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md).
- Research: [raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md) §1–§4, §8 and [raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md) §7.
- P6 evidence: an A/A report, a process-attribution validation (Job Object vs `GetProcessExtendedInfos` vs ETW) and a CDP-overhead pilot under `wiki/raw/evidence/phase-p6-benchmark-harness/`.
