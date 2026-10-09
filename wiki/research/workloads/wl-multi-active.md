---
id: wl-multi-active
type: workload
title: "Multiple simultaneously active sessions"
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
master_prompt_ref: 8
parameters:
  tabs: 4
  distinct_sites: 4
  foreground_rotation_s: 10
  duration_s: 300
fixture_path: benchmarks/workloads/multi-active/
equivalence_check: "Fixture reports a content hash, its fixture version and completed work units to the fixture server; a trial is valid only if these match the expected values for every configuration in the block."
phase: phase-p6-benchmark-harness
tags:
  - research
  - workload
---

# Multiple simultaneously active sessions

**Kind:** `synthetic-local` (master prompt §9 item 8). **Status:** proposed. The fixture does not exist yet; it is built in `phase-p6-benchmark-harness`.

`tabs` tabs on `distinct_sites` local sites. Each runs a moderate periodic workload (timers, DOM updates). The foreground tab rotates every `foreground_rotation_s`. The isolation experiment varies `distinct_sites`.

## Parameters (proposed; frozen at pre-registration)

| Parameter | Value |
|---|---|
| `tabs` | `4` |
| `distinct_sites` | `4` |
| `foreground_rotation_s` | `10` |
| `duration_s` | `300` |

## Script

1. Open the tabs.
2. Rotate the foreground tab for `duration_s`.
3. Sample memory and CPU throughout.

## Equivalence check

Fixture reports a content hash, its fixture version and completed work units to the fixture server; a trial is valid only if these match the expected values for every configuration in the block.

## Metrics collected

[metric-tree-private-commit](../metrics/metric-tree-private-commit.md), [metric-process-count](../metrics/metric-process-count.md), [metric-tree-cpu-time](../metrics/metric-tree-cpu-time.md), [metric-restore-latency](../metrics/metric-restore-latency.md)

## Hosting

The fixture is served by the harness's local fixture server. The shared hosting rules (loopback origins, scheme, cache headers, and keeping local fixtures separate from public sites) are in [ov-research-workload-catalog](../ov-research-workload-catalog.md).
