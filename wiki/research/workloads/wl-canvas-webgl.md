---
id: wl-canvas-webgl
type: workload
title: "Canvas / WebGL application"
status: proposed
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/research/measurement-methodology.md
related:
  - ov-research-workload-catalog
  - comp-benchmark-harness
approvable: true
workload_kind: synthetic-local
master_prompt_ref: 7
parameters:
  canvas_phase_s: 60
  webgl_phase_s: 60
  scene_seed: 7
fixture_path: benchmarks/workloads/canvas-webgl/
equivalence_check: "Fixture reports a content hash, its fixture version and completed work units to the fixture server; a trial is valid only if these match the expected values for every configuration in the block."
phase: phase-p6-benchmark-harness
tags:
  - research
  - workload
---

# Canvas / WebGL application

**Kind:** `synthetic-local` (master prompt §9 item 7). **Status:** proposed. The fixture does not exist yet; it is built in `phase-p6-benchmark-harness`.

Two phases with deterministic, seeded scenes: a 2D canvas particle scene and a WebGL scene. If WebGL context creation fails, that is recorded as unsupported and is not scored.

## Parameters (proposed; frozen at pre-registration)

| Parameter | Value |
|---|---|
| `canvas_phase_s` | `60` |
| `webgl_phase_s` | `60` |
| `scene_seed` | `7` |

## Script

1. Run the canvas phase.
2. Run the WebGL phase.
3. The fixture reports work units completed and whether WebGL was supported.

## Equivalence check

Fixture reports a content hash, its fixture version and completed work units to the fixture server; a trial is valid only if these match the expected values for every configuration in the block.

## Metrics collected

[metric-canvas-throughput](../metrics/metric-canvas-throughput.md), [metric-frame-interval](../metrics/metric-frame-interval.md), [metric-frame-miss-rate](../metrics/metric-frame-miss-rate.md), [metric-tree-cpu-time](../metrics/metric-tree-cpu-time.md)

## Hosting

The fixture is served by the harness's local fixture server. The shared hosting rules (loopback origins, scheme, cache headers, and keeping local fixtures separate from public sites) are in [ov-research-workload-catalog](../ov-research-workload-catalog.md).
