---
id: metric-policy-eval-latency
type: metric
title: "Navigation policy evaluation latency"
status: proposed
updated: 2026-10-15
sources:
  - raw/evidence/phase-p4-security/microbench-harness-run.txt
  - raw/research/measurement-methodology.md
  - raw/00-master-prompt.md
related:
  - ov-research-plan
  - ov-research-traceability
  - comp-telemetry
  - comp-benchmark-harness
approvable: true
unit: us
definition: "Wall-clock duration of one evaluation of Ferrum's navigation/permission policy (input: request descriptor; output: allow/deny/prompt decision), excluding any user prompt time."
boundary_start: "Entry of the policy evaluation function (tracing span open, QPC)"
boundary_end: "Return of the decision (tracing span close)"
method: "tracing spans in comp-security-engine recorded to telemetry; per trial median/p95/p99 over all evaluations; also an in-process micro-benchmark (Rust bench) for regression tracking, reported separately."
tool: "tracing crate spans + Ferrum telemetry exporter; microbenchmark harness crates/security/examples/microbench.rs (p4.12)"
normalization: microseconds
support: unverified
phase: phase-p4-security
tags:
  - research
  - metric
unverified:
  - claim: "tracing span overhead is small relative to the proposed 1 ms p95 threshold of hyp-12"
    verify_in: phase-p5-telemetry
---

# Navigation policy evaluation latency

| Field | Value |
|---|---|
| Unit | us |
| Support | `unverified`. Nothing has been measured yet |
| Validated in | `phase-p4-security` |

**Definition.** Wall-clock duration of one evaluation of Ferrum's navigation/permission policy (input: request descriptor; output: allow/deny/prompt decision), excluding any user prompt time.

**Boundaries.** Start: Entry of the policy evaluation function (tracing span open, QPC). End: Return of the decision (tracing span close).

**Method.** tracing spans in comp-security-engine recorded to telemetry; per trial median/p95/p99 over all evaluations; also an in-process micro-benchmark (Rust bench) for regression tracking, reported separately.

**Tool.** tracing crate spans + Ferrum telemetry exporter; microbenchmark harness `crates/security/examples/microbench.rs` (built in p4.12; [harness run](../../raw/evidence/phase-p4-security/microbench-harness-run.txt), harness operation only, not a result)

**Normalisation.** microseconds

## Notes
- Instrumentation adds overhead of its own. The span overhead is measured with an empty span and reported next to the result, UNVERIFIED[phase-p5-telemetry].
- Security **correctness** tests are kept separate from this performance metric (master prompt §7, [raw/00-master-prompt.md](../../raw/00-master-prompt.md)).

## Used by
Experiments and hypotheses that reference this metric are listed in [ov-research-traceability](../ov-research-traceability.md).
