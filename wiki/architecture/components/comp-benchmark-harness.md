---
id: comp-benchmark-harness
type: component
title: "Benchmark harness (Rust orchestrator + Node/TS Playwright runners)"
status: planned
updated: 2026-10-19
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/research/measurement-methodology.md
  - raw/research/tauri-webview2-capabilities.md
related: [ov-arch-system-overview, ov-arch-data-flows, ov-arch-configuration, ov-arch-crate-graph, ov-arch-trust-boundaries, comp-app-shell, comp-baseline-app, comp-competitor-browsers, comp-webview2-runtime, comp-windows-os, comp-telemetry, comp-network-logger, comp-research-analysis, comp-core, adr-0009, adr-0012, risk-r04, risk-r05, risk-r06, phase-p1-foundation, phase-p6-benchmark-harness, exp-baseline-footprint, exp-startup, exp-navigation, exp-rendering, exp-energy, exp-reliability]
approvable: true
path: benchmarks/
crate: ferrum-bench
trust_level: trusted
phase_introduced: phase-p6-benchmark-harness
shipped: false
unsafe_code: true
responsibilities:
  - "Launch benchmark targets suspended inside a harness-owned Job Object with a fresh profile / user data folder (master prompt 4); WebView2 process attribution mode (job-only vs union with GetProcessExtendedInfos) decided by an early check, see body"
  - "Execute repeatable workloads via Playwright scripts over CDP (master prompt 4, 9)"
  - "Collect measurements externally: Job accounting, summed per-process counters, ETW cross-check (master prompt 4, 7)"
  - "Validate workload equivalence across targets (request logs, page checks) (master prompt 4)"
  - "Run repeated, randomized or counterbalanced trials with warmup (master prompt 4, 10)"
  - "Export raw results with full metadata: hardware, OS, versions, browser policies, config hash (master prompt 4, 10)"
  - "Generate per-run summaries for analysis (master prompt 4); statistics proper live in comp-research-analysis"
  - "Coordinate with a separate elevated energy sampler process (risk-r04), design to be decided"
interfaces:
  - "CLI: ferrum-bench run --experiment <file> --out benchmarks/results/<run-id>"
  - "Playwright runner contract: node script per workload, receives CDP endpoint, emits JSON marks"
  - "Trial record schema (JSONL) + run manifest"
connects:
  - to: comp-app-shell
    label: "launch Ferrum suspended in a Job Object with a fresh user data folder and run config"
    kind: process-spawn
    crosses_trust_boundary: false
  - to: comp-baseline-app
    label: "launch baseline suspended in a Job Object with a fresh user data folder"
    kind: process-spawn
    crosses_trust_boundary: false
  - to: comp-competitor-browsers
    label: "launch Chrome/Edge with fresh profiles and recorded policies"
    kind: process-spawn
    crosses_trust_boundary: true
  - to: comp-competitor-browsers
    label: "drive workloads via Playwright connectOverCDP"
    kind: cdp
    crosses_trust_boundary: true
  - to: comp-webview2-runtime
    label: "drive Ferrum/baseline tab pages via Playwright connectOverCDP (remote-debugging-port, benchmark runs only)"
    kind: cdp
    crosses_trust_boundary: true
  - to: comp-windows-os
    label: "Job Object accounting, per-process counters, ETW cross-check"
    kind: os-api
    crosses_trust_boundary: true
  - to: comp-telemetry
    label: "reuses the process-sampling library (ferrum-telemetry win module)"
    kind: rust-api
    crosses_trust_boundary: false
  - to: comp-research-analysis
    label: "raw trial data and run metadata (benchmarks/results, archived to wiki/raw/bench)"
    kind: data-export
    crosses_trust_boundary: false
  - to: comp-core
    label: "experiment and run config types"
    kind: rust-api
    crosses_trust_boundary: false
unverified:
  - claim: "Chrome and Edge processes stay inside the harness Job Object (no breakaway)"
    verify_in: phase-p6-benchmark-harness
  - claim: "WebView2 processes spawned for Ferrum/baseline (msedgewebview2.exe browser, renderer, GPU, utility, crashpad) are descendants of the host process and join the harness Job Object (measurement note 2.2: parent/child relationship UNCERTAIN; risk-r05)"
    verify_in: phase-p6-benchmark-harness
  - claim: "Applying remote-debugging-port to all products has negligible measurement overhead"
    verify_in: phase-p6-benchmark-harness
---

# comp-benchmark-harness

Owner decisions Q9/Q10 (adr-0012): a **Rust orchestrator** (`benchmarks/runners/orchestrator`, crate `ferrum-bench`) handles scheduling, randomisation and Windows-API sampling. It invokes **Node/TypeScript Playwright scripts** (`benchmarks/runners/playwright`).

## Measurement architecture

The recommendations below come from the [measurement note §2](../../raw/research/measurement-methodology.md):

1. **Isolation.** Each target starts *suspended* in a fresh Job Object with a fresh profile/UDF (`WEBVIEW2_USER_DATA_FOLDER` for Ferrum and the baseline), then is resumed. Per the Job Object docs, child processes join the job by default (VERIFIED, measurement note §2.3). Breakaway behaviour for Chrome/Edge is UNVERIFIED[phase-p6-benchmark-harness].
   - **WebView2 caveat.** That the WebView2 processes spawned for Ferrum/baseline are *descendants* of the host process, and therefore join the harness job, is UNVERIFIED[phase-p6-benchmark-harness]. The measurement note §2.2 marks the `msedgewebview2.exe` parent/child relationship UNCERTAIN, and risk-r05 lists it as unverified. If the WebView2 browser process were started outside the host's process tree (e.g. by a broker), a job-only attribution would omit most of Ferrum's and the baseline's cost.
   - **Early check (proposed).** This plan proposes verifying it before P6, as an added check on the P1 spike S1 build: run it inside a Job Object, compare job membership against `GetProcessExtendedInfos` and the crashpad process, and record the result in the spike report. Adding this check to the P1 task list is a change to `phase-p1-foundation` that needs owner approval. Until that check or the P6 A/A validation passes, the attribution mode stays open.
   - **Attribution modes.** *Mode J (job-only)*: used only if the check shows every environment PID inside the job. *Mode U (union, fallback)*: the attributed set for Ferrum/baseline is the union of job members and the `GetProcessExtendedInfos` PID set (VERIFIED to exclude crashpad, measurement note §2.2), plus crashpad found by tree/ETW, or crashpad excluded from **all** products symmetrically, recorded per run. Every PID is paired with its process creation time (`GetProcessTimes`) to guard against PID reuse. Chrome/Edge use job membership (plus ETW cross-check) in both modes.
   - **Trial invalidation.** In Mode J, a trial fails if a browser-reported PID (`GetProcessExtendedInfos` for WebView2) lies outside the job. In Mode U, a trial fails only if a PID cannot be attributed by either source, or if a PID/creation-time pair changes identity mid-trial. The run manifest records which mode the spike or A/A validation validated.
2. **Driving.** Playwright `connectOverCDP` for every product, so all products share the same automation path ([Tauri note §7](../../raw/research/tauri-webview2-capabilities.md): CDP is "significantly lower fidelity", risk-r06). Ferrum gets `--remote-debugging-port` through `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`, and its overhead is piloted (UNVERIFIED[phase-p6-benchmark-harness]). How tab WebViews map to CDP targets was checked in p5.12 ([note](../../raw/evidence/phase-p5-telemetry/devtools-targets-p5.12-note.md)): in the per-site mode every tab is its own page target (the shell is listed too); in the per-site-udf mode no tab is on the port, so workloads in that mode need a test-only Ferrum command or are left out of CDP driving (adr-0012).
3. **Elevation split.** Ferrum must **not** run elevated, because environment browser flags are ignored for elevated apps (VERIFIED, Tauri note §7). An energy sampler that needs admin (risk-r04) therefore runs as a **separate elevated process** writing a timestamped file. Its tool and driver choice (e.g. PawnIO-based) awaits owner answers; a wall-power meter may be required (measurement note).
4. **Fairness.** As-shipped browser defaults give the headline result. Flags are used only in labelled ablations. Policies such as Edge sleeping tabs and Chrome Memory Saver are recorded per trial (measurement note §5).
5. **Outputs.** Results go to `benchmarks/results/<run-id>/` (gitignored). Complete runs are archived unedited to `wiki/raw/bench/<run-id>/` and never cherry-picked (master prompt §10).

## Unsafe invariants

`unsafe` is allowed only in `mod win` (Job Objects, `CREATE_SUSPENDED` launch, `ResumeThread`, ETW session control):

- every handle is RAII-closed;
- the job is created with kill-on-close so no target outlives the harness;
- a process is assigned to the job **before** its main thread resumes;
- no pointer escapes the call.

Process counters reuse `ferrum-telemetry::win`.
