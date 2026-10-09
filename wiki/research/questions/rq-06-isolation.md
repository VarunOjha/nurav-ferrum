---
id: rq-06
type: research-question
title: "Isolation model: shared resources and overhead"
status: open
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/research/measurement-methodology.md
related:
  - ov-research-plan
  - ov-research-traceability
  - exp-isolation-overhead
approvable: true
question: "Which resources remain shared under WebView2 profile-based per-site isolation, and how much memory and process overhead does per-site isolation add compared with a single shared profile and with per-site user data folders?"
hypotheses:
  - hyp-13
paper_section: "System Architecture; Security and Usability Tradeoffs"
phase: phase-p6-benchmark-harness
tags:
  - research
---

# RQ-06: Isolation model: shared resources and overhead

> Which resources remain shared under WebView2 profile-based per-site isolation, and how much memory and process overhead does per-site isolation add compared with a single shared profile and with per-site user data folders?

**Why it matters.** Master prompt §5 Phase 3 requires stating precisely which resources remain shared. It depends on the profile being reachable (`risk-r01`, `adr-0010`).

**Hypotheses (pre-registration candidates).**
- [hyp-13](../hypotheses/hyp-13-profiles-cheaper-than-udfs.md): Per-site profiles cost less memory per site than per-site user data folders

**Experiments.** [exp-isolation-overhead](../experiments/exp-isolation-overhead.md)

**Paper section.** System Architecture; Security and Usability Tradeoffs. See [ov-research-paper-plan](../ov-research-paper-plan.md).

**Status.** `open`. No data exists. The answer will be written here only after the experiments listed above reach `analyzed`, and it will link `raw/bench/` run ids (see [ov-research-traceability](../ov-research-traceability.md)).
