---
id: risk-r14
type: risk
title: "Benchmark harness and instrumentation bias (observer effect, asymmetric tooling, confirmation bias)"
status: open
updated: 2026-10-08
sources:
  - raw/research/measurement-methodology.md
  - raw/00-master-prompt.md
  - raw/research/related-work-seed.md
related: [phase-p6-benchmark-harness, phase-p5-telemetry, phase-p8-research-paper, adr-0012, adr-0013, comp-benchmark-harness, comp-research-analysis, comp-telemetry, risk-r05, risk-r06, risk-r12, risk-r13, risk-r25, qual-testing-strategy]
approvable: true
tags: [bias, methodology, benchmark, integrity]
likelihood: 3
impact: 5
mitigation: "Preregister primary metrics, analysis families and practical thresholds before data collection; validate the harness with A/A tests and known-answer fixtures; instrument every product the same way; run the sampler as a separate process at a fixed rate and measure its own cost; check workload equivalence per trial; keep raw data immutable in raw/bench; analyse every run, failures included."
spike: null
owner_phase: phase-p6-benchmark-harness
trigger: "Ferrum's own telemetry is enabled during comparative runs; an analysis choice is made after seeing results; workload equivalence checks fail for one product; runs are excluded without a preregistered rule."
fallback: "Re-run the affected campaign under the corrected protocol; report the deviation in the paper's threats to validity."
unverified:
  - claim: "Running the resource sampler at the planned rate adds overhead below the A/A noise floor"
    verify_in: phase-p6-benchmark-harness
---

# risk-r14: Benchmark harness and instrumentation bias (observer effect, asymmetric tooling, confirmation bias)

| Likelihood | Impact | Score | Status | Owner phase |
|---|---|---|---|---|
| 3 | 5 | 15 | open | `phase-p6-benchmark-harness` |

Score = likelihood × impact (SCHEMA §6.5). Scales are planning judgements, not measurements. Full register: [ov-risk-register](ov-risk-register.md).

## Description and evidence

The team that builds Ferrum also builds the harness, so bias can enter through tooling as well as through choices. Sources:

- MM §4.2: Playwright over CDP has lower fidelity, and an open debug port may change behaviour; use the **same** CDP path for every product.
- MM §7.1: randomized block design, discarded and reported warm-ups, preregistered primary metrics, and an **A/A test** to measure the harness noise floor.
- MM §7.6 lists the benchmarking-methodology literature (metadata verified, content not re-read), including work on measurement bias from environment and setup. Read before citing.
- Master prompt §10 and §14: record raw measurements, capture failure conditions, never cherry-pick, all measurements from actual experiments.
- Master prompt §7 Security Overhead: separate correctness tests from performance measurements.

Ferrum's own telemetry engine (comp-telemetry) costs resources. Comparative runs must either disable it or count its cost as part of Ferrum, decided before data collection.

Sources: [measurement-methodology](../raw/research/measurement-methodology.md), [master prompt](../raw/00-master-prompt.md), [related-work-seed](../raw/research/related-work-seed.md). Abbreviations: TW = tauri-webview2-capabilities, MM = measurement-methodology, RW = related-work-seed, NX = nextjs-stack, LW = llm-wiki-pattern.

## Early-warning signs (trigger)

Ferrum's own telemetry is enabled during comparative runs; an analysis choice is made after seeing results; workload equivalence checks fail for one product; runs are excluded without a preregistered rule.

## Mitigation

Preregister primary metrics, analysis families and practical thresholds before data collection; validate the harness with A/A tests and known-answer fixtures; instrument every product the same way; run the sampler as a separate process at a fixed rate and measure its own cost; check workload equivalence per trial; keep raw data immutable in raw/bench; analyse every run, failures included.

## De-risking spike (proposed)

Phase: `phase-p6-benchmark-harness`. Harness validation suite (see qual-testing-strategy): A/A campaign, known-answer memory and CPU fixtures, sampler self-cost measurement, and a workload-equivalence check that compares DOM hash and request count across products.

The `spike` frontmatter field stays `null` until the owning phase page assigns a task id (`pN.M`); the integrator or phase owner then sets it here.

## Fallback if realised

Re-run the affected campaign under the corrected protocol; report the deviation in the paper's threats to validity.

## Unverified claims

- Running the resource sampler at the planned rate adds overhead below the A/A noise floor. UNVERIFIED[phase-p6-benchmark-harness]

## Affects

`phase-p6-benchmark-harness`, `phase-p5-telemetry`, `phase-p8-research-paper`, `adr-0012`, `adr-0013`, `comp-benchmark-harness`, `comp-research-analysis`, `comp-telemetry`, `risk-r05`, `risk-r06`, `risk-r12`, `risk-r13`, `risk-r25`, `qual-testing-strategy`
