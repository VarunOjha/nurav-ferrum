---
id: metric-canvas-throughput
type: metric
title: "Canvas / WebGL fixture throughput"
status: proposed
updated: 2026-10-08
sources:
  - raw/research/measurement-methodology.md
  - raw/00-master-prompt.md
related:
  - ov-research-plan
  - ov-research-traceability
  - comp-telemetry
  - comp-benchmark-harness
approvable: true
unit: ops/s
definition: "Fixture-defined work units completed per second (e.g. frames of a fixed deterministic scene rendered) during a fixed-duration phase, reported by the fixture."
boundary_start: "Fixture phase start (page clock)"
boundary_end: "Fixture phase end (page clock)"
method: "Deterministic seeded scene; fixture also reports whether WebGL context creation succeeded (unsupported recorded, not scored)."
tool: "Fixture JavaScript (benchmarks/workloads/canvas-webgl/)"
normalization: "ops/s; ratio to competitor"
support: unverified
phase: phase-p6-benchmark-harness
tags:
  - research
  - metric
unverified:
  - claim: "WebGL is available in every compared product"
    verify_in: phase-p6-benchmark-harness
---

# Canvas / WebGL fixture throughput

| Field | Value |
|---|---|
| Unit | ops/s |
| Support | `unverified`. Nothing has been measured yet |
| Validated in | `phase-p6-benchmark-harness` |

**Definition.** Fixture-defined work units completed per second (e.g. frames of a fixed deterministic scene rendered) during a fixed-duration phase, reported by the fixture.

**Boundaries.** Start: Fixture phase start (page clock). End: Fixture phase end (page clock).

**Method.** Deterministic seeded scene; fixture also reports whether WebGL context creation succeeded (unsupported recorded, not scored).

**Tool.** Fixture JavaScript (benchmarks/workloads/canvas-webgl/)

**Normalisation.** ops/s; ratio to competitor

## Notes
- This is an app-level score defined by the fixture and is only comparable within one fixture version. The fixture version hash is recorded with every trial.
- WebGL availability in each product: UNVERIFIED[phase-p6-benchmark-harness].

## Used by
Experiments and hypotheses that reference this metric are listed in [ov-research-traceability](../ov-research-traceability.md).
