---
id: wl-many-background
type: workload
title: "Many background sessions"
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
master_prompt_ref: 9
parameters:
  background_tabs: 20
  foreground_tabs: 1
  duration_s: 1800
  activation_trace_seed: 1001
  activations: 40
fixture_path: benchmarks/workloads/many-background/
equivalence_check: "Fixture reports a content hash, its fixture version and completed work units to the fixture server; a trial is valid only if these match the expected values for every configuration in the block."
phase: phase-p6-benchmark-harness
tags:
  - research
  - workload
---

# Many background sessions

**Kind:** `synthetic-local` (master prompt §9 item 9). **Status:** proposed. The fixture does not exist yet; it is built in `phase-p6-benchmark-harness`.

One foreground tab plus `background_tabs` background tabs with a mix of fixtures: static pages, SPAs with timers, a paused media page, a page with an unsaved form and a page holding a download. A seeded activation trace brings background tabs to the foreground. Confirmatory trials use different seeds from the ones used to tune the adaptive policy (see the statistical analysis plan).

## Parameters (proposed; frozen at pre-registration)

| Parameter | Value |
|---|---|
| `background_tabs` | `20` |
| `foreground_tabs` | `1` |
| `duration_s` | `1800` |
| `activation_trace_seed` | `1001` |
| `activations` | `40` |

## Script

1. Open all tabs.
2. Follow the activation trace for `duration_s`.
3. Record lifecycle transitions, memory, CPU and energy.

## Equivalence check

Fixture reports a content hash, its fixture version and completed work units to the fixture server; a trial is valid only if these match the expected values for every configuration in the block.

## Metrics collected

[metric-tree-private-commit](../metrics/metric-tree-private-commit.md), [metric-tree-cpu-time](../metrics/metric-tree-cpu-time.md), [metric-restore-latency](../metrics/metric-restore-latency.md), [metric-objective-j](../metrics/metric-objective-j.md), [metric-safety-violations](../metrics/metric-safety-violations.md), [metric-cpu-package-energy](../metrics/metric-cpu-package-energy.md)

## Hosting

The fixture is served by the harness's local fixture server. The shared hosting rules (loopback origins, scheme, cache headers, and keeping local fixtures separate from public sites) are in [ov-research-workload-catalog](../ov-research-workload-catalog.md).
