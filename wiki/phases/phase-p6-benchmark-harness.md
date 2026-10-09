---
id: phase-p6-benchmark-harness
type: phase
title: "P6 Benchmark harness (Milestone M5): baseline app, workloads, fair automated trials, campaign C1"
status: planned
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/research/measurement-methodology.md
  - raw/research/tauri-webview2-capabilities.md
  - raw/research/related-work-seed.md
related: [phase-p5-telemetry, phase-p7-lifecycle, comp-benchmark-harness, comp-baseline-app, comp-research-analysis, comp-telemetry, risk-r04, risk-r05, risk-r06, adr-0009, adr-0012, adr-0013, exp-baseline-footprint, exp-startup, exp-navigation, exp-rendering, exp-energy, exp-reliability, exp-security-overhead, exp-isolation-overhead]
approvable: true
phase: phase-p6-benchmark-harness
tags: [milestone-m5, benchmarks, harness, fairness, statistics, preregistration]
milestone: M5
order: 6
depends_on: [phase-p5-telemetry]
est_sessions: 8
entry_criteria:
  - "phase-p5-telemetry has status done and key phase-p5-telemetry#exit is APPROVED."
  - "Owner approval recorded and not stale in plan/approvals.json for the P6 dependency set: schema, phase-p6-benchmark-harness, every ADR in decisions, every component in components, every experiment in experiments."
  - "Owner has answered the measurement questions: wall-power meter availability, PawnIO driver and elevated sampler consent, default versus matched browser settings, branded Chrome versus Chrome for Testing, Evergreen versus Fixed Version WebView2."
  - "No open Q-NNN blocks any id in the dependency set."
deliverables:
  - "comp-baseline-app: minimal Tauri + WebView2 app with default settings on the same Tauri and runtime versions as Ferrum."
  - "Ten local synthetic workloads matching master prompt section 9, plus a small supplementary public-site list; equivalence checks per workload."
  - "Configuration files for cfg-chrome, cfg-edge, cfg-tauri-baseline, cfg-ferrum-nolifecycle (cfg-ferrum-adaptive added in P7) with every fairness control recorded."
  - "Rust orchestrator: randomised or counterbalanced trial scheduling with recorded seed, suspended launch inside a Job Object, fresh profile per trial, failure capture, run manifest."
  - "Node/TS Playwright workload scripts driving all products through the same CDP path."
  - "Environment and version capture per run; version pinning (Chrome for Testing, optional WebView2 Fixed Version)."
  - "Frame timing via PresentMon; energy via an elevated separate sampler if approved, otherwise exp-energy marked unsupported."
  - "Python analysis pipeline (adr-0013) with tests on synthetic data of known properties."
  - "A/A noise-floor run and sample-size decision; preregistered hypotheses; campaign C1 raw data for the non-lifecycle experiments."
  - "BENCHMARKING.md and REPRODUCIBILITY.md completed for the harness."
tasks:
  - id: p6.1
    title: "Baseline app (comp-baseline-app): single WebView, Tauri defaults, no Ferrum features, same Tauri and WebView2 runtime as Ferrum"
    verify: "Builds in release; a smoke script loads a fixture page in it; its dependency versions diff against Ferrum's shows only intended differences (saved as evidence)."
  - id: p6.2
    title: "Workload fixtures 1 to 10 (static, JS-heavy SPA, large DOM, continuous scrolling, frequent navigation, video playback, canvas/WebGL, multiple active sessions, many background sessions, repeated destroy/restore) served locally with deterministic content and parameters on wl-* pages"
    verify: "Each workload has a wl-* page with status implemented, a fixture_path that exists and an equivalence check; a test confirms deterministic content (same content hash across two server starts)."
  - id: p6.3
    title: "Supplementary public-site workloads: short list without login or Google auth, visited with recorded date and response metadata, clearly labelled supplementary"
    verify: "List on the workload pages; a dry run records status codes and page sizes for each site (evidence), no results drawn from it."
  - id: p6.4
    title: "Configuration system: versioned files in benchmarks/configurations/ for each cfg-*, recording viewport, cache policy, network conditions, extensions, background throttling, sleeping tabs and Startup Boost (Edge), Memory Saver and Energy Saver (Chrome), CDP flag, profile path, window state; 'as-shipped' and 'matched' variants if the owner chose both"
    verify: "Schema validation test of every configuration file; a config diff report shows the only differences between products are the documented ones."
  - id: p6.5
    title: "Rust orchestrator: trial plan generated from config plus seed (block randomisation or counterbalancing), suspended launch inside a Job Object, fresh profile folder, resume, sampling via the telemetry crate, timeouts, every trial recorded including failures"
    verify: "Unit tests: plan generation is deterministic for a seed and balanced across arms; integration test with a dummy target confirms Job Object accounting includes child processes and failed trials appear in the manifest."
  - id: p6.6
    title: "Node/TS Playwright scripts per workload invoked by the orchestrator; all products driven through connectOverCDP for parity (risk-r06); outputs JSON per trial"
    verify: "Each script runs once against each configuration in a dry run and exits 0, or the failure is recorded with the unsupported feature named."
  - id: p6.7
    title: "Environment capture per run (OS build, product versions, WebView2 runtime and channel, power plan, display, background process snapshot) and version pinning (Chrome for Testing download with checksum; WebView2 Fixed Version if chosen; Edge update blocking method)"
    verify: "Run manifest of a dry run contains every listed field; a version change between two trials of one campaign is flagged by a test."
  - id: p6.8
    title: "Frame timing: PresentMon as a separate elevated process keyed to the target process; LoAF collection in workload scripts"
    verify: "Dry run on the scrolling workload produces PresentMon output for each product, or the product is recorded as unsupported for that metric."
  - id: p6.9
    title: "Energy: if approved, separate elevated sampler reading AMD package energy through PawnIO or LibreHardwareMonitor, integrated over the trial window and labelled modeled CPU-package energy; wall-power meter path if available; otherwise exp-energy and its metrics marked unsupported"
    verify: "Either a dry run produces energy samples with documented units and wrap handling, or the metric pages show support unsupported with the reason; never an estimate."
  - id: p6.10
    title: "Python analysis pipeline (comp-research-analysis): ingest run manifests and raw files, descriptive statistics (mean, median, SD, p95), bootstrap CIs (BCa with percentile fallback), Hedges' g, Cliff's delta, Holm or Benjamini-Hochberg, plots; pinned Python dependencies"
    verify: "pytest suite passes on synthetic datasets with known differences (clearly labelled synthetic, never reported); rerunning analysis twice produces byte-identical outputs."
  - id: p6.11
    title: "Harness validation: A/A run (same configuration as two arms) to estimate the noise floor; pilot runs per experiment family; sample-size decision per experiment recorded on its page"
    verify: "A/A raw data in raw/bench/<run-id>/; analysis report shows the noise floor; each experiment page has trials.target set with a written justification."
  - id: p6.12
    title: "Preregistration: hypotheses for C1 experiments moved to preregistered with practical thresholds and analysis plans; owner approves before any comparative run"
    verify: "Every hypothesis linked from C1 experiments has status preregistered and an APPROVED effective state in plan/approvals.json before p6.13 starts."
  - id: p6.13
    title: "Campaign C1: run exp-baseline-footprint, exp-startup, exp-navigation, exp-rendering, exp-reliability, exp-security-overhead, exp-isolation-overhead (and exp-energy if supported) for cfg-chrome, cfg-edge, cfg-tauri-baseline, cfg-ferrum-nolifecycle"
    verify: "Each experiment has a raw/bench/<run-id>/ folder with manifest, every trial (failures included) and checksums; experiment status complete with results_ref; no result statements written anywhere yet."
  - id: p6.14
    title: "BENCHMARKING.md and REPRODUCIBILITY.md: how to reproduce a campaign from a clean machine"
    verify: "Owner or Claude follows REPRODUCIBILITY.md for one workload in a fresh checkout and gets a valid run manifest."
  - id: p6.15
    title: "Research track: literature batch 6 (benchmarking methodology, statistics for performance evaluation)"
    verify: "New raw research notes; methodology pages cite them."
  - id: p6.16
    title: "Exit gate and owner M5 review"
    verify: "All evidence files exist; lint clean; owner approves phase-p6-benchmark-harness#exit."
test_gate:
  automated:
    - "cargo fmt --all -- --check"
    - "cargo clippy --workspace --all-targets -- -D warnings"
    - "cargo test --workspace (orchestrator plan generation, Job Object integration)"
    - "cargo deny check"
    - "apps/desktop shell: npm run lint && npm run typecheck && npm run test"
    - "Tauri release build of apps/desktop"
    - "benchmarks/runners: npm run lint && npm run typecheck && npm run test"
    - "analysis: pytest"
    - "Configuration schema validation and config diff report (p6.4)"
    - "Workload determinism test (p6.2)"
    - "Analysis determinism check (p6.10)"
    - "Security suite and P3/P2 regressions"
    - "cd interactive_plan && npm run lint:wiki"
  manual:
    - "Owner reviews the configuration diff report and confirms fairness (no resource-saving feature of Chrome or Edge disabled just to help Ferrum)."
    - "Owner approves the preregistered hypotheses before C1."
    - "Owner confirms the benchmark machine state for C1 (power plan, no other heavy apps, display settings) per BENCHMARKING.md."
  evidence:
    - raw/evidence/phase-p6-benchmark-harness/cargo-test.txt
    - raw/evidence/phase-p6-benchmark-harness/cargo-clippy.txt
    - raw/evidence/phase-p6-benchmark-harness/shell-tests.txt
    - raw/evidence/phase-p6-benchmark-harness/release-build.txt
    - raw/evidence/phase-p6-benchmark-harness/runner-tests.txt
    - raw/evidence/phase-p6-benchmark-harness/analysis-tests.txt
    - raw/evidence/phase-p6-benchmark-harness/config-diff.md
    - raw/evidence/phase-p6-benchmark-harness/workload-determinism.txt
    - raw/evidence/phase-p6-benchmark-harness/aa-noise-floor.md
    - raw/evidence/phase-p6-benchmark-harness/c1-run-index.md
    - raw/evidence/phase-p6-benchmark-harness/reproducibility-dry-run.txt
    - raw/evidence/phase-p6-benchmark-harness/regression.txt
    - raw/evidence/phase-p6-benchmark-harness/wiki-lint.txt
exit_criteria:
  - "Every master prompt section 16 Milestone 5 deliverable exists: Chrome and Edge automation, Ferrum automation, controlled workloads, experiment configuration system, repeatable benchmark execution."
  - "A/A noise floor measured and sample sizes justified."
  - "C1 raw data complete for every planned trial (failures recorded, none dropped)."
  - "Energy either measured with a defensible, labelled method or marked unsupported."
  - "Owner approved phase-p6-benchmark-harness#exit."
risks: [risk-r04, risk-r05, risk-r06, risk-r11, risk-r12, risk-r13, risk-r14, risk-r25]
decisions: [adr-0009, adr-0012, adr-0013, adr-0014]
experiments: [exp-baseline-footprint, exp-startup, exp-navigation, exp-rendering, exp-energy, exp-reliability, exp-security-overhead, exp-isolation-overhead]
components: [comp-benchmark-harness, comp-baseline-app, comp-research-analysis, comp-telemetry]
unverified:
  - claim: "Chrome and Edge child processes stay inside a Job Object created by the orchestrator (no breakaway)"
    verify_in: phase-p6-benchmark-harness
  - claim: "A reliable method exists to block Edge Stable updates during a campaign"
    verify_in: phase-p6-benchmark-harness
  - claim: "PawnIO or LibreHardwareMonitor exposes AMD package energy on this machine's CPU generation"
    verify_in: phase-p6-benchmark-harness
  - claim: "The remote-debugging port has negligible overhead, or it is applied equally to all products"
    verify_in: phase-p6-benchmark-harness
  - claim: "PresentMon can attribute presents to each product's GPU or browser process"
    verify_in: phase-p6-benchmark-harness
---

# P6 Benchmark harness (Milestone M5)

P6 builds a harness that compares Ferrum with Chrome, Edge and a minimal Tauri baseline fairly and repeatably, validates it with an A/A test, preregisters hypotheses, and collects the first campaign of raw data (C1). It covers master prompt sections 7 to 10 and section 16 "Milestone 5" ([raw/00-master-prompt.md](../raw/00-master-prompt.md)), with the owner's Q6, Q9 and Q10 choices ([raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md); adr-0009, adr-0012, adr-0013).

Phase-label note: [raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md) section 11 says "P-harness (M5)" and "P-bench"; both are this phase.

## Scope

Fairness rules from the measurement note (sections 2, 5, 6, 7):

- Launch every target suspended inside a Job Object with a fresh profile; attribute processes by identity.
- Record and pin browser resource features: Edge sleeping tabs (default on), Edge Startup Boost (pre-launches processes, invalidates cold start), Chrome background freezing, Chrome Memory Saver (set explicitly by policy because its default is unclear). Never disable Chrome or Edge resource-saving features just to help Ferrum (master prompt section 8).
- Fix the window state: Windows 11 changes timer resolution and EcoQoS for hidden or minimised windows.
- Drive all products through the same CDP path, because Playwright's `connectOverCDP` is lower fidelity and only Ferrum needs it ([raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md) section 7). Ferrum must run non-elevated for the environment-variable debug flag, so the energy sampler is a separate elevated process.
- Energy: AMD counters are modelled, exclude DRAM and under-report against wall power (Zen 2 study). Claims follow the note's section 5.5 policy: "modeled CPU-package energy" only with counters, "system energy" only with a meter, per-process energy unsupported (risk-r04).
- Statistics: with 30 trials per arm only fairly large effects are detectable (note section 7.2), so the A/A test and pilots set the trial counts, and practical thresholds are written down before C1.

### Why campaign C1 is in P6

Master prompt Milestone 5 asks for "repeatable benchmark execution". Running C1 here proves that, and gives P7 a no-lifecycle reference measured with the same harness. C1 data is analysed mechanically (the pipeline runs) but not interpreted: no result statements, no hypothesis verdicts until [P8](phase-p8-research-paper.md).

### Where raw benchmark data lives

SCHEMA section 3.1 puts benchmark outputs under `wiki/raw/bench/<run-id>/`. Campaign data may be large for git. Open question for the owner: commit full raw data, or commit manifests and checksums with the data archived elsewhere (for example a release asset) and referenced from the manifest.

## Out of scope

- Lifecycle policies and cfg-ferrum-adaptive ([P7](phase-p7-lifecycle.md)).
- Interpreting results or writing the paper (P8).

## Step order

```mermaid
flowchart LR
  p6_1["p6.1 baseline app"] --> p6_4["p6.4 configs"]
  p6_2["p6.2 local workloads"] --> p6_6["p6.6 Playwright scripts"]
  p6_3["p6.3 public workloads"] --> p6_6
  p6_4 --> p6_5["p6.5 orchestrator"]
  p6_5 --> p6_6
  p6_5 --> p6_7["p6.7 env capture + pinning"]
  p6_5 --> p6_8["p6.8 frame timing"]
  p6_5 --> p6_9["p6.9 energy"]
  p6_6 --> p6_11["p6.11 A/A + pilots"]
  p6_7 --> p6_11
  p6_8 --> p6_11
  p6_9 --> p6_11
  p6_10["p6.10 analysis pipeline"] --> p6_11
  p6_11 --> p6_12["p6.12 preregistration"]
  p6_12 --> p6_13["p6.13 campaign C1"]
  p6_13 --> p6_14["p6.14 docs"]
  p6_14 --> p6_16["p6.16 exit review"]
  p6_15["p6.15 literature batch 6"] --> p6_16
```

## Checkpoints and interruption recovery

- Campaigns are long and will be interrupted. The orchestrator writes each trial's result and the manifest entry before starting the next trial, and can resume a campaign from its manifest with the same seed and plan. A resumed campaign is recorded as such in the manifest; trials are never re-run selectively to replace unwanted results.
- `STATUS.md` names the run id and the next trial index during C1.

## Owner review checkpoint (adr-0014)

The owner checks the fairness diff, approves the preregistration before C1 (p6.12, a mid-phase approval) and approves `phase-p6-benchmark-harness#exit` after C1.
