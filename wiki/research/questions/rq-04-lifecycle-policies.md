---
id: rq-04
type: research-question
title: "Adaptive lifecycle policies versus fixed policies"
status: open
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/research/measurement-methodology.md
related:
  - ov-research-plan
  - ov-research-traceability
  - exp-lifecycle-policies
approvable: true
question: "Do memory-pressure-based and adaptive cost-aware lifecycle policies achieve a better trade-off between memory, energy and session-restoration latency (objective J) than no lifecycle management and a fixed idle-time discard policy, without violating lifecycle safety rules?"
hypotheses:
  - hyp-08
  - hyp-09
  - hyp-10
  - hyp-11
paper_section: "Adaptive Resource Management; Results: lifecycle"
phase: phase-p7-lifecycle
tags:
  - research
---

# RQ-04: Adaptive lifecycle policies versus fixed policies

> Do memory-pressure-based and adaptive cost-aware lifecycle policies achieve a better trade-off between memory, energy and session-restoration latency (objective J) than no lifecycle management and a fixed idle-time discard policy, without violating lifecycle safety rules?

**Why it matters.** This is the central research question of master prompt §6 ([raw/00-master-prompt.md](../../raw/00-master-prompt.md)). There is substantial prior art ([ov-research-related-work-seed](../ov-research-related-work-seed.md)), so no novelty is assumed.

**Hypotheses (pre-registration candidates).**
- [hyp-08](../hypotheses/hyp-08-adaptive-reduces-memory.md): The adaptive policy reduces memory relative to no lifecycle management
- [hyp-09](../hypotheses/hyp-09-adaptive-lowest-objective.md): The adaptive policy achieves the lowest objective J
- [hyp-10](../hypotheses/hyp-10-adaptive-restore-latency.md): The adaptive policy has lower restoration latency than the fixed idle-time policy
- [hyp-11](../hypotheses/hyp-11-lifecycle-safety.md): No lifecycle policy discards a protected session

**Experiments.** [exp-lifecycle-policies](../experiments/exp-lifecycle-policies.md)

**Paper section.** Adaptive Resource Management; Results: lifecycle. See [ov-research-paper-plan](../ov-research-paper-plan.md).

**Status.** `open`. No data exists. The answer will be written here only after the experiments listed above reach `analyzed`, and it will link `raw/bench/` run ids (see [ov-research-traceability](../ov-research-traceability.md)).
