---
id: wl-session-churn
type: workload
title: "Repeated session destruction and restoration"
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
master_prompt_ref: 10
parameters:
  cycles: 50
  tabs_per_cycle: 5
  restart_every_cycles: 10
fixture_path: benchmarks/workloads/session-churn/
equivalence_check: "Fixture reports a content hash, its fixture version and completed work units to the fixture server; a trial is valid only if these match the expected values for every configuration in the block."
phase: phase-p6-benchmark-harness
tags:
  - research
  - workload
---

# Repeated session destruction and restoration

**Kind:** `synthetic-local` (master prompt §9 item 10). **Status:** proposed. The fixture does not exist yet; it is built in `phase-p6-benchmark-harness`.

Repeatedly open tabs, navigate them, close or discard them and restore them. Every `restart_every_cycles` cycles the application is restarted and the session restored. Fixture pages hold a deterministic state token so a correct restore can be checked.

## Parameters (proposed; frozen at pre-registration)

| Parameter | Value |
|---|---|
| `cycles` | `50` |
| `tabs_per_cycle` | `5` |
| `restart_every_cycles` | `10` |

## Script

1. Run `cycles` cycles of open, navigate, discard or close, then restore.
2. Restart the app periodically.
3. Verify the state token after each restore.

## Equivalence check

Fixture reports a content hash, its fixture version and completed work units to the fixture server; a trial is valid only if these match the expected values for every configuration in the block.

## Metrics collected

[metric-restore-latency](../metrics/metric-restore-latency.md), [metric-restore-success-rate](../metrics/metric-restore-success-rate.md), [metric-tree-private-commit](../metrics/metric-tree-private-commit.md), [metric-objective-j](../metrics/metric-objective-j.md)

## Hosting

The fixture is served by the harness's local fixture server. The shared hosting rules (loopback origins, scheme, cache headers, and keeping local fixtures separate from public sites) are in [ov-research-workload-catalog](../ov-research-workload-catalog.md).
