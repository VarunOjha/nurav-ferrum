---
id: rq-07
type: research-question
title: "Reliability over long sessions and failures"
status: open
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/research/measurement-methodology.md
related:
  - ov-research-plan
  - ov-research-traceability
  - exp-reliability
approvable: true
question: "Is Ferrum as reliable as the comparison browsers over long-running sessions, and does it restore sessions and recover from renderer crashes and network interruptions correctly?"
hypotheses:
  - hyp-14
  - hyp-15
paper_section: "Results: reliability"
phase: phase-p6-benchmark-harness
tags:
  - research
---

# RQ-07: Reliability over long sessions and failures

> Is Ferrum as reliable as the comparison browsers over long-running sessions, and does it restore sessions and recover from renderer crashes and network interruptions correctly?

**Why it matters.** Master prompt §7 (reliability) and §11 (recovery after renderer crashes).

**Hypotheses (pre-registration candidates).**
- [hyp-14](../hypotheses/hyp-14-memory-growth-non-inferior.md): Ferrum's memory growth over long sessions is non-inferior to Edge and Chrome
- [hyp-15](../hypotheses/hyp-15-restore-and-recovery.md): Ferrum restores sessions and recovers from renderer crashes reliably

**Experiments.** [exp-reliability](../experiments/exp-reliability.md)

**Paper section.** Results: reliability. See [ov-research-paper-plan](../ov-research-paper-plan.md).

**Status.** `open`. No data exists. The answer will be written here only after the experiments listed above reach `analyzed`, and it will link `raw/bench/` run ids (see [ov-research-traceability](../ov-research-traceability.md)).
