---
id: rq-05
type: research-question
title: "Overhead of security controls"
status: open
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/research/measurement-methodology.md
related:
  - ov-research-plan
  - ov-research-traceability
  - exp-security-overhead
approvable: true
question: "What latency and memory overhead do Ferrum's navigation-policy and permission controls add relative to an otherwise identical build with the security engine bypassed?"
hypotheses:
  - hyp-12
paper_section: "Security and Usability Tradeoffs"
phase: phase-p6-benchmark-harness
tags:
  - research
---

# RQ-05: Overhead of security controls

> What latency and memory overhead do Ferrum's navigation-policy and permission controls add relative to an otherwise identical build with the security engine bypassed?

**Why it matters.** Master prompt §7 (security overhead), measured separately from the security correctness tests.

**Hypotheses (pre-registration candidates).**
- [hyp-12](../hypotheses/hyp-12-security-overhead-small.md): The security engine adds negligible navigation latency and memory

**Experiments.** [exp-security-overhead](../experiments/exp-security-overhead.md)

**Paper section.** Security and Usability Tradeoffs. See [ov-research-paper-plan](../ov-research-paper-plan.md).

**Status.** `open`. No data exists. The answer will be written here only after the experiments listed above reach `analyzed`, and it will link `raw/bench/` run ids (see [ov-research-traceability](../ov-research-traceability.md)).
