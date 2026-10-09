---
id: rq-03
type: research-question
title: "Defensible energy measurement and comparison"
status: open
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/research/measurement-methodology.md
  - raw/research/related-work-seed.md
related:
  - ov-research-plan
  - ov-research-traceability
  - exp-energy
  - risk-r04
approvable: true
question: "Can the energy consumption of the compared products be measured defensibly on the project's AMD desktop and, where it can, how does energy per completed workload differ between them?"
hypotheses:
  - hyp-07
paper_section: "Results: energy"
phase: phase-p6-benchmark-harness
tags:
  - research
unverified:
  - claim: "Zen 2 findings on AMD package energy counters (modeled, no DRAM domain, under-reporting) hold for the owner's Ryzen generation"
    verify_in: phase-p6-benchmark-harness
---

# RQ-03: Defensible energy measurement and comparison

> Can the energy consumption of the compared products be measured defensibly on the project's AMD desktop and, where it can, how does energy per completed workload differ between them?

**Why it matters.** Master prompt §7 (energy) requires marking energy as unsupported rather than estimating it. AMD package counters were found to be modeled on Zen 2 ([seed](../../raw/research/related-work-seed.md) E4; [measurement note](../../raw/research/measurement-methodology.md) §5.1); whether this holds for the owner's CPU generation is UNVERIFIED[phase-p6-benchmark-harness] (`risk-r04`, owner question R-Q6 in [ov-research-plan](../ov-research-plan.md)).

**Hypotheses (pre-registration candidates).**
- [hyp-07](../hypotheses/hyp-07-energy-per-workload.md): Ferrum uses less energy per completed workload than Chrome and Edge (conditional on a supported energy metric)

**Experiments.** [exp-energy](../experiments/exp-energy.md)

**Paper section.** Results: energy. See [ov-research-paper-plan](../ov-research-paper-plan.md).

**Status.** `open`. No data exists. The answer will be written here only after the experiments listed above reach `analyzed`, and it will link `raw/bench/` run ids (see [ov-research-traceability](../ov-research-traceability.md)).
