---
id: rq-01
type: research-question
title: "Resource footprint versus browsers and baseline"
status: open
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/research/measurement-methodology.md
related:
  - ov-research-plan
  - ov-research-traceability
  - exp-baseline-footprint
approvable: true
question: "How do the memory and CPU footprints of Ferrum without application-level lifecycle management compare with Google Chrome, Microsoft Edge and a minimal Tauri + WebView2 baseline on equivalent controlled workloads, when resources are attributed to exactly the processes each product creates?"
hypotheses:
  - hyp-01
  - hyp-02
  - hyp-03
paper_section: "Results: footprint"
phase: phase-p6-benchmark-harness
tags:
  - research
---

# RQ-01: Resource footprint versus browsers and baseline

> How do the memory and CPU footprints of Ferrum without application-level lifecycle management compare with Google Chrome, Microsoft Edge and a minimal Tauri + WebView2 baseline on equivalent controlled workloads, when resources are attributed to exactly the processes each product creates?

**Why it matters.** Master prompt objectives 6 and 9 ([raw/00-master-prompt.md](../../raw/00-master-prompt.md)). The answer depends on attributing processes correctly (`risk-r05`).

**Hypotheses (pre-registration candidates).**
- [hyp-01](../hypotheses/hyp-01-idle-memory-vs-browsers.md): Ferrum uses less tree private commit than Chrome and Edge
- [hyp-02](../hypotheses/hyp-02-overhead-vs-tauri-baseline.md): Ferrum's container overhead over the minimal Tauri baseline is small (non-inferiority)
- [hyp-03](../hypotheses/hyp-03-background-cpu-without-lifecycle.md): Without lifecycle management Ferrum spends more background CPU than Chrome and Edge

**Experiments.** [exp-baseline-footprint](../experiments/exp-baseline-footprint.md)

**Paper section.** Results: footprint. See [ov-research-paper-plan](../ov-research-paper-plan.md).

**Status.** `open`. No data exists. The answer will be written here only after the experiments listed above reach `analyzed`, and it will link `raw/bench/` run ids (see [ov-research-traceability](../ov-research-traceability.md)).
