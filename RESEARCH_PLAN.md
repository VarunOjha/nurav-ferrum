# RESEARCH_PLAN.md: Ferrum research plan (summary)

> This is a human-facing summary. The **canonical pages are in [`wiki/research/`](wiki/research/)**, and the wiki wins if the two disagree ([wiki/SCHEMA.md](wiki/SCHEMA.md) §4.2).
> Status: **P0 planning draft, waiting for owner approval.** No experiments have been run and no measurements exist. Every hypothesis is a `draft` candidate for pre-registration.

## Goal

Ferrum is a Rust + Tauri 2 + WebView2 web-app container for Windows 11 and also a research project ([master prompt](wiki/raw/00-master-prompt.md) §§6–10, 13). The research compares Chrome (A), Edge (B), a minimal Tauri baseline (C), Ferrum without lifecycle management (D) and Ferrum with an adaptive lifecycle policy (E). It asks whether resource-aware WebView lifecycle policies improve the memory/energy/restore-latency trade-off. **Nothing is assumed to be novel.** The seed list already contains close prior art ([related-work seed](wiki/research/ov-research-related-work-seed.md)).

## Research questions

| RQ | Topic | Hypotheses | Experiments |
|---|---|---|---|
| [rq-01](wiki/research/questions/rq-01-resource-footprint.md) | Resource footprint versus browsers and baseline | [hyp-01](wiki/research/hypotheses/hyp-01-idle-memory-vs-browsers.md), [hyp-02](wiki/research/hypotheses/hyp-02-overhead-vs-tauri-baseline.md), [hyp-03](wiki/research/hypotheses/hyp-03-background-cpu-without-lifecycle.md) | [exp-baseline-footprint](wiki/research/experiments/exp-baseline-footprint.md) |
| [rq-02](wiki/research/questions/rq-02-responsiveness.md) | Startup, navigation and rendering responsiveness | [hyp-04](wiki/research/hypotheses/hyp-04-startup-window-visible.md), [hyp-05](wiki/research/hypotheses/hyp-05-navigation-non-inferiority.md), [hyp-06](wiki/research/hypotheses/hyp-06-rendering-non-inferiority.md) | [exp-navigation](wiki/research/experiments/exp-navigation.md), [exp-rendering](wiki/research/experiments/exp-rendering.md), [exp-startup](wiki/research/experiments/exp-startup.md) |
| [rq-03](wiki/research/questions/rq-03-energy.md) | Defensible energy measurement and comparison | [hyp-07](wiki/research/hypotheses/hyp-07-energy-per-workload.md) | [exp-energy](wiki/research/experiments/exp-energy.md) |
| [rq-04](wiki/research/questions/rq-04-lifecycle-policies.md) | Adaptive lifecycle policies versus fixed policies | [hyp-08](wiki/research/hypotheses/hyp-08-adaptive-reduces-memory.md), [hyp-09](wiki/research/hypotheses/hyp-09-adaptive-lowest-objective.md), [hyp-10](wiki/research/hypotheses/hyp-10-adaptive-restore-latency.md), [hyp-11](wiki/research/hypotheses/hyp-11-lifecycle-safety.md) | [exp-lifecycle-policies](wiki/research/experiments/exp-lifecycle-policies.md) |
| [rq-05](wiki/research/questions/rq-05-security-overhead.md) | Overhead of security controls | [hyp-12](wiki/research/hypotheses/hyp-12-security-overhead-small.md) | [exp-security-overhead](wiki/research/experiments/exp-security-overhead.md) |
| [rq-06](wiki/research/questions/rq-06-isolation.md) | Isolation model: shared resources and overhead | [hyp-13](wiki/research/hypotheses/hyp-13-profiles-cheaper-than-udfs.md) | [exp-isolation-overhead](wiki/research/experiments/exp-isolation-overhead.md) |
| [rq-07](wiki/research/questions/rq-07-reliability.md) | Reliability over long sessions and failures | [hyp-14](wiki/research/hypotheses/hyp-14-memory-growth-non-inferior.md), [hyp-15](wiki/research/hypotheses/hyp-15-restore-and-recovery.md) | [exp-reliability](wiki/research/experiments/exp-reliability.md) |

## Key documents

- Hub, phase mapping and **open questions for the owner**: [ov-research-plan](wiki/research/ov-research-plan.md)
- Configurations A–E, the four lifecycle strategies, ablations: [ov-research-configurations](wiki/research/ov-research-configurations.md)
- Objective function J = αM + βE + γL (ratio normalisation, pre-registered weights, simplex sensitivity analysis, not claimed novel): [ov-research-objective-function](wiki/research/ov-research-objective-function.md)
- Workloads (10 controlled local workloads, a security-overhead mix, supplementary public sites): [ov-research-workload-catalog](wiki/research/ov-research-workload-catalog.md)
- Fairness protocol (as-shipped defaults as the headline, Job Object process attribution, version pinning, per-trial environment record): [ov-research-fairness-protocol](wiki/research/ov-research-fairness-protocol.md)
- Statistical analysis plan (pre-registration, block bootstrap BCa CIs, Holm, effect sizes, practical thresholds, no cherry-picking): [ov-research-statistical-analysis-plan](wiki/research/ov-research-statistical-analysis-plan.md)
- Threats to validity: [ov-research-threats-to-validity](wiki/research/ov-research-threats-to-validity.md)
- Traceability matrix: [ov-research-traceability](wiki/research/ov-research-traceability.md)
- Experiment log (append-only): [ov-research-experiment-log](wiki/research/ov-research-experiment-log.md)
- Paper plan (acmart proposed, venue TBD, Results stays empty until data exists): [ov-research-paper-plan](wiki/research/ov-research-paper-plan.md)
- 27 metrics in [wiki/research/metrics/](wiki/research/metrics/) and 12 workloads in [wiki/research/workloads/](wiki/research/workloads/)

## Headline methodological choices (proposed)

1. **Memory headline:** private commit summed over the processes in the product's Job Object. Summed working set is secondary because it double-counts shared pages.
2. **Energy:** AMD package counters were found to be modeled on Zen 2 (E4); whether this holds for the owner's CPU generation is UNVERIFIED[phase-p6-benchmark-harness]. The counters go through a validation gate. If the gate fails, energy is marked **unsupported** and never estimated. Whole-system energy needs a wall meter.
3. **"Time to interactive"** (retired upstream) is replaced by FCP/LCP plus Long Animation Frames.
4. **At least 30 randomised blocks** per configuration × workload where practical. The trial is the unit of analysis. Every run, including failures, is kept.

## Next steps

1. The owner reviews the research pages (read-only portal) and approves them in Claude Code and answers the open questions R-Q1 to R-Q15 (registered as Q-ids in [ov-open-questions](wiki/overview/ov-open-questions.md); mapping in [ov-research-plan](wiki/research/ov-research-plan.md)).
2. P5 implements and validates the metrics. P6 builds the harness, runs A/A and the energy validation, then freezes the pre-registration. P7 runs the lifecycle experiments (campaign C2, plus the proposed C2b re-run that compares configuration E with A–D, owner question R-Q15 = Q-208, task p7.14). Literature batches run P1–P6, P7 closes the review and the owner approves the novelty assessment (p7.12), P8 writes the paper from the closed review.
