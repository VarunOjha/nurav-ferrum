---
id: phase-p7-lifecycle
type: phase
title: "P7 Adaptive lifecycle (Milestone M6): state machine, deterministic and adaptive policies, safety, campaign C2"
status: planned
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/research/tauri-webview2-capabilities.md
  - raw/research/measurement-methodology.md
  - raw/research/related-work-seed.md
related: [ov-open-questions, ov-research-threats-to-validity, phase-p6-benchmark-harness, phase-p8-research-paper, comp-resource-manager, comp-webview-manager, comp-telemetry, comp-benchmark-harness, risk-r03, risk-r05, adr-0004, adr-0013, exp-lifecycle-policies]
approvable: true
phase: phase-p7-lifecycle
tags: [milestone-m6, lifecycle, state-machine, adaptive-policy, safety, literature-review]
milestone: M6
order: 7
depends_on: [phase-p6-benchmark-harness]
est_sessions: 6
entry_criteria:
  - "phase-p6-benchmark-harness has status done and key phase-p6-benchmark-harness#exit is APPROVED."
  - "Owner approval recorded and not stale in plan/approvals.json for the P7 dependency set: schema, phase-p7-lifecycle, every ADR in decisions, every component in components, exp-lifecycle-policies."
  - "No open Q-NNN blocks any id in the dependency set."
deliverables:
  - "Lifecycle state machine with states ACTIVE, BACKGROUND, IDLE, DISCARD_CANDIDATE, DISCARDED, RESTORING."
  - "Input signals: last interaction, memory pressure, site activity, restoration cost, media playback, active downloads, user exclusions, unsaved-form risk."
  - "Mechanisms modelled separately: hide, suspend (TrySuspend), low memory target (MemoryUsageTargetLevel), discard (destroy WebView, keep state), restore."
  - "Safety mechanism: no discard during a potentially destructive operation."
  - "Four strategies behind runtime flags: none, fixed idle-time, memory-pressure, adaptive cost-aware (J = alpha M + beta E + gamma L)."
  - "Safety tests, soak test, lifecycle telemetry."
  - "Campaign C2 raw data for exp-lifecycle-policies."
  - "Closed literature review and novelty assessment, owner-approved, before any novelty framing."
tasks:
  - id: p7.1
    title: "State machine as pure Rust in the resource-manager crate: explicit transition table, guards, events; stateDiagram-v2 on the component page with the exact state names"
    verify: "Unit tests for every allowed and every forbidden transition; randomised event-sequence tests assert invariants (the active tab is never discarded; RESTORING only leads to ACTIVE or back to DISCARDED on failure; an excluded site never leaves BACKGROUND)."
  - id: p7.2
    title: "Signal providers: last interaction, memory-pressure signal from a Windows API chosen and documented, per-tab activity (with the attribution limits from P5), restoration cost estimate, media playback, active downloads, user exclusions, unsaved-form risk"
    verify: "Each provider has unit tests with mocked inputs and an integration test against a fixture (media fixture, download fixture, form fixture); limits recorded on comp-resource-manager."
  - id: p7.3
    title: "Mechanisms: hide, TrySuspend/Resume while hidden, MemoryUsageTargetLevel (never mixed with suspend), discard by closing the WebView while keeping URL, history position and scroll state, restore"
    verify: "Integration tests per mechanism assert the WebView2 state after the call (IsSuspended, level, WebView closed) and that restore returns to the same URL; unsafe invariants documented."
  - id: p7.4
    title: "Safety mechanism: block discard (or require an explicit safety step) while media plays, a download is active, a form is dirty, a beforeunload handler is registered, or the site is excluded"
    verify: "Safety tests: each guard fixture is never discarded under any policy, including under simulated memory pressure; each refusal is logged as a transition record with reason."
  - id: p7.5
    title: "Deterministic policies behind runtime flags so one binary runs every strategy: none, fixed idle-time, memory-pressure"
    verify: "Unit tests per policy on scripted signal timelines; config selection test proves the same binary switches strategy by flag."
  - id: p7.6
    title: "Adaptive cost-aware policy prototype: J = alpha M + beta E + gamma L with documented measurement and normalisation of M, E, L; beta set to zero and documented if energy is unsupported; weights chosen on a calibration workload set disjoint from the evaluation set"
    verify: "Unit tests on the objective computation; calibration procedure and chosen weights committed before C2; the calibration and evaluation workload sets are listed and disjoint."
  - id: p7.7
    title: "Lifecycle telemetry: every transition and refusal recorded with the P5 transition schema; restoration latency (L) measured from restore start to the restored page's FCP"
    verify: "Integration test asserts transition records for a scripted discard and restore and a restoration latency record."
  - id: p7.8
    title: "Soak test: long-running session with the background-sessions workload under each policy, checking memory growth, crashes and restore success"
    verify: "Soak run raw output saved; any crash or failed restore becomes a bug with a regression test before C2."
  - id: p7.9
    title: "Harness configurations: cfg-ferrum-adaptive plus cfg-ferrum-fixed-idle and cfg-ferrum-mempressure as documented cfg-* additions"
    verify: "Configuration schema validation passes; config diff shows only the lifecycle flag differs between Ferrum configurations."
  - id: p7.10
    title: "Preregistration for exp-lifecycle-policies: hypotheses preregistered with practical thresholds, owner-approved before C2"
    verify: "Linked hypotheses have status preregistered and an APPROVED effective state before p7.11 starts."
  - id: p7.11
    title: "Campaign C2: exp-lifecycle-policies comparing the four strategies on identical workloads, with Chrome and Edge as as-shipped references"
    verify: "raw/bench/<run-id>/ with manifest, every trial, checksums; experiment status complete with results_ref; no result statements yet."
  - id: p7.12
    title: "Literature review closure and novelty assessment against prior art (Chrome freezing, Edge sleeping tabs, Android standby buckets and lmkd, cost-aware caching such as GreedyDual-Size, and anything found in batches 1 to 6); owner approves the assessment"
    verify: "Novelty assessment page lists every close prior-art item with a verified source and states what, if anything, differs; owner approval recorded; P8 may not frame novelty without it."
  - id: p7.14
    title: "Campaign C2b (conditional on Q-208 option a): rerun exp-baseline-footprint, exp-navigation, exp-rendering, exp-energy (if its metrics are supported) and exp-reliability with cfg-ferrum-adaptive included, under the frozen C1 protocol, in new randomised blocks never pooled with C1"
    verify: "raw/bench/<run-id>/ sealed (SEALED file present) with manifest, every trial and checksums; or, if Q-208 = option b, a deviation note in ov-research-threats-to-validity citing the owner's answer in raw/owner/. No result statements yet."
  - id: p7.13
    title: "Exit gate and owner M6 review"
    verify: "All evidence files exist; lint clean; owner approves phase-p7-lifecycle#exit."
test_gate:
  automated:
    - "cargo fmt --all -- --check"
    - "cargo clippy --workspace --all-targets -- -D warnings"
    - "cargo test --workspace (state machine, policies, signal providers)"
    - "cargo deny check"
    - "apps/desktop shell: npm run lint && npm run typecheck && npm run test"
    - "Tauri release build of apps/desktop"
    - "Lifecycle safety suite (p7.4)"
    - "Mechanism integration tests (p7.3)"
    - "Security suite, telemetry validation suite, P3/P2 regressions"
    - "analysis: pytest"
    - "cd interactive_plan && npm run lint:wiki"
  manual:
    - "Owner uses Ferrum with the adaptive policy for a working session and reports any lost state or surprising discard."
    - "Owner approves the calibration procedure and weights before C2."
    - "Owner approves the novelty assessment (p7.12)."
  evidence:
    - raw/evidence/phase-p7-lifecycle/cargo-test.txt
    - raw/evidence/phase-p7-lifecycle/cargo-clippy.txt
    - raw/evidence/phase-p7-lifecycle/shell-tests.txt
    - raw/evidence/phase-p7-lifecycle/release-build.txt
    - raw/evidence/phase-p7-lifecycle/safety-suite.txt
    - raw/evidence/phase-p7-lifecycle/mechanism-tests.txt
    - raw/evidence/phase-p7-lifecycle/soak.txt
    - raw/evidence/phase-p7-lifecycle/calibration.md
    - raw/evidence/phase-p7-lifecycle/c2-run-index.md
    - raw/evidence/phase-p7-lifecycle/c2b-run-index.md
    - raw/evidence/phase-p7-lifecycle/regression.txt
    - raw/evidence/phase-p7-lifecycle/wiki-lint.txt
    - raw/evidence/phase-p7-lifecycle/manual-checklist.md
exit_criteria:
  - "Every master prompt section 16 Milestone 6 deliverable exists: lifecycle state machine, fixed-time policies, memory-pressure policies, adaptive policy prototype, safety tests, comparative benchmarks (C2 raw data)."
  - "No discard during a guarded operation in any test or soak run."
  - "Literature review closed and novelty assessment owner-approved."
  - "Owner approved phase-p7-lifecycle#exit."
risks: [risk-r03, risk-r05, risk-r23]
decisions: [adr-0004, adr-0013, adr-0014]
experiments: [exp-lifecycle-policies]
components: [comp-resource-manager, comp-webview-manager, comp-telemetry, comp-benchmark-harness]
unverified:
  - claim: "Windows provides a usable memory-pressure notification for a desktop app (for example a memory resource notification API)"
    verify_in: phase-p7-lifecycle
  - claim: "WebView2 exposes whether a document is playing audio or media"
    verify_in: phase-p7-lifecycle
  - claim: "Unsaved-form risk can be detected reliably (dirty-form heuristics, beforeunload registration)"
    verify_in: phase-p7-lifecycle
  - claim: "WebView2 fires page freeze and resume events when a WebView is suspended"
    verify_in: phase-p7-lifecycle
  - claim: "Hiding or suspending a WebView reduces CPU and memory in a measurable way"
    verify_in: phase-p7-lifecycle
---

# P7 Adaptive lifecycle (Milestone M6)

P7 implements the experimental adaptive WebView lifecycle manager and collects campaign C2. It covers master prompt section 5 "Phase 4: Resource Management", section 6 "Adaptive Lifecycle Research" and section 16 "Milestone 6" ([raw/00-master-prompt.md](../raw/00-master-prompt.md)).

## Scope

```mermaid
stateDiagram-v2
  [*] --> ACTIVE
  ACTIVE --> BACKGROUND
  BACKGROUND --> ACTIVE
  BACKGROUND --> IDLE
  IDLE --> ACTIVE
  IDLE --> DISCARD_CANDIDATE
  DISCARD_CANDIDATE --> IDLE
  DISCARD_CANDIDATE --> DISCARDED
  DISCARDED --> RESTORING
  RESTORING --> ACTIVE
  RESTORING --> DISCARDED
```

This diagram is the starting proposal for p7.1; the authoritative transition table lives on the comp-resource-manager page once implemented.

Research findings that shape the design:

- **Suspend and discard are different.** Edge treats sleeping and discarding separately ([raw/research/related-work-seed.md](../raw/research/related-work-seed.md)). WebView2 TrySuspend needs the WebView hidden, is best effort, and must not be mixed with MemoryUsageTargetLevel ([raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md) section 6). Both are raw COM only (risk-r03).
- **Per-tab cost is hard to attribute.** Renderers are shared across WebViews in one user data folder ([raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md) section 2), so "site activity" and "memory per tab" signals are approximations and are documented as such (risk-r05).
- **Prior art is close.** Chrome freezes CPU-heavy hidden tabs, Edge sleeps tabs under memory pressure, Android standby buckets may use a learned model, GreedyDual-Size weighs cost, size and recency (seed list). The master prompt says not to assume novelty; p7.12 closes the literature review before P8 frames anything.
- **Strategies are compared on one binary.** Master prompt section 6 asks for policies behind feature flags so identical workloads run under each. Runtime flags keep the binary identical across arms; a compile-time feature may additionally gate the experimental adaptive code.
- **Weights are not tuned on the evaluation data.** alpha, beta and gamma are fixed on a disjoint calibration set before C2, to avoid overfitting the policy to the benchmark.

## Out of scope

- Learned or ML policies beyond the cost-aware prototype.
- Interpreting C2 or claiming improvements (P8).

## Step order

```mermaid
flowchart LR
  p7_1["p7.1 state machine"] --> p7_5["p7.5 deterministic policies"]
  p7_2["p7.2 signals"] --> p7_5
  p7_3["p7.3 mechanisms"] --> p7_4["p7.4 safety guards"]
  p7_1 --> p7_4
  p7_4 --> p7_5
  p7_5 --> p7_6["p7.6 adaptive policy"]
  p7_3 --> p7_7["p7.7 lifecycle telemetry"]
  p7_6 --> p7_8["p7.8 soak"]
  p7_7 --> p7_8
  p7_8 --> p7_9["p7.9 harness configs"]
  p7_9 --> p7_10["p7.10 preregistration"]
  p7_10 --> p7_11["p7.11 campaign C2"]
  p7_12["p7.12 literature closure"] --> p7_13["p7.13 exit review"]
  p7_11 --> p7_14["p7.14 campaign C2b (if Q-208 a)"]
  p7_14 --> p7_13
```

p7.12 can run any time during P7 but must finish before the exit review.

## Checkpoints and interruption recovery

- Same campaign-resume rules as P6: per-trial persistence, resumable manifest, no selective re-runs.
- Calibration weights are committed (p7.6) before C2 starts; a resumed session must not change them without a logged DECIDE and a new preregistration.

## Owner review checkpoint (adr-0014)

Three owner approvals inside this phase: calibration and weights, preregistration (p7.10) and novelty assessment (p7.12). Then `phase-p7-lifecycle#exit`.
