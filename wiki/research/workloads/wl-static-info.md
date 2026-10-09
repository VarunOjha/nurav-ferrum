---
id: wl-static-info
type: workload
title: "Static informational website"
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
master_prompt_ref: 1
parameters:
  settle_s: 30
  idle_window_s: 300
  images: 10
  scripts: 0
  timers: 0
fixture_path: benchmarks/workloads/static-info/
equivalence_check: "Fixture reports a content hash, its fixture version and completed work units to the fixture server; a trial is valid only if these match the expected values for every configuration in the block."
phase: phase-p6-benchmark-harness
tags:
  - research
  - workload
---

# Static informational website

**Kind:** `synthetic-local` (master prompt §9 item 1). **Status:** proposed. The fixture does not exist yet; it is built in `phase-p6-benchmark-harness`.

A self-contained article page: fixed HTML/CSS, about 10 locally served images, no JavaScript timers and no third-party requests. It is also the start page for startup measurements.

## Parameters (proposed; frozen at pre-registration)

| Parameter | Value |
|---|---|
| `settle_s` | `30` |
| `idle_window_s` | `300` |
| `images` | `10` |
| `scripts` | `0` |
| `timers` | `0` |

## Script

1. Launch the product with the fixture URL as its start page (startup experiments), or navigate to it (other experiments).
2. Settle for `settle_s`.
3. Measure the idle window of `idle_window_s` with the window visible, unoccluded and at a fixed size.

## Equivalence check

Fixture reports a content hash, its fixture version and completed work units to the fixture server; a trial is valid only if these match the expected values for every configuration in the block.

## Metrics collected

[metric-tree-private-commit](../metrics/metric-tree-private-commit.md), [metric-tree-cpu-time](../metrics/metric-tree-cpu-time.md), [metric-startup-window-visible](../metrics/metric-startup-window-visible.md), [metric-startup-fcp](../metrics/metric-startup-fcp.md), [metric-cpu-package-energy](../metrics/metric-cpu-package-energy.md)

## Hosting

The fixture is served by the harness's local fixture server. The shared hosting rules (loopback origins, scheme, cache headers, and keeping local fixtures separate from public sites) are in [ov-research-workload-catalog](../ov-research-workload-catalog.md).
