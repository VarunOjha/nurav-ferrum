---
id: wl-video-playback
type: workload
title: "Video playback"
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
master_prompt_ref: 6
parameters:
  duration_s: 120
  resolution: 1920x1080
  fps: 30
  audio: silent-track
  loop: true
fixture_path: benchmarks/workloads/video-playback/
equivalence_check: "Fixture reports a content hash, its fixture version and completed work units to the fixture server; a trial is valid only if these match the expected values for every configuration in the block."
phase: phase-p6-benchmark-harness
tags:
  - research
  - workload
---

# Video playback

**Kind:** `synthetic-local` (master prompt §9 item 6). **Status:** proposed. The fixture does not exist yet; it is built in `phase-p6-benchmark-harness`.

A locally served test-pattern video that the project generates itself, so no third-party content is involved. Codec and container are chosen in P6 so that every product can decode them.

## Parameters (proposed; frozen at pre-registration)

| Parameter | Value |
|---|---|
| `duration_s` | `120` |
| `resolution` | `1920x1080` |
| `fps` | `30` |
| `audio` | `silent-track` |
| `loop` | `True` |

## Script

1. Load the page and start playback.
2. Play for `duration_s`.
3. The fixture reports `getVideoPlaybackQuality()` counters when they are available.

## Equivalence check

Fixture reports a content hash, its fixture version and completed work units to the fixture server; a trial is valid only if these match the expected values for every configuration in the block.

## Metrics collected

[metric-cpu-package-energy](../metrics/metric-cpu-package-energy.md), [metric-wall-energy](../metrics/metric-wall-energy.md), [metric-tree-cpu-time](../metrics/metric-tree-cpu-time.md), [metric-frame-interval](../metrics/metric-frame-interval.md)

## Hosting

The fixture is served by the harness's local fixture server. The shared hosting rules (loopback origins, scheme, cache headers, and keeping local fixtures separate from public sites) are in [ov-research-workload-catalog](../ov-research-workload-catalog.md).
