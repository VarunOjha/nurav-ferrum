---
id: wl-spa-js-heavy
type: workload
title: "JavaScript-heavy single-page application"
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
master_prompt_ref: 2
parameters:
  route_changes: 20
  list_items: 5000
  compute_seed: 42
  think_time_ms: 500
fixture_path: benchmarks/workloads/spa-js-heavy/
equivalence_check: "Fixture reports a content hash, its fixture version and completed work units to the fixture server; a trial is valid only if these match the expected values for every configuration in the block."
phase: phase-p6-benchmark-harness
tags:
  - research
  - workload
---

# JavaScript-heavy single-page application

**Kind:** `synthetic-local` (master prompt §9 item 2). **Status:** proposed. The fixture does not exist yet; it is built in `phase-p6-benchmark-harness`.

A client-side-routed SPA with no framework download from the network. Every route change renders a large list and runs seeded, deterministic computation (sorting, filtering, JSON transforms).

## Parameters (proposed; frozen at pre-registration)

| Parameter | Value |
|---|---|
| `route_changes` | `20` |
| `list_items` | `5000` |
| `compute_seed` | `42` |
| `think_time_ms` | `500` |

## Script

1. Load the SPA.
2. Run `route_changes` scripted route changes with `think_time_ms` between them.
3. The fixture reports a checksum of the computed results (equivalence) and LoAF entries.

## Equivalence check

Fixture reports a content hash, its fixture version and completed work units to the fixture server; a trial is valid only if these match the expected values for every configuration in the block.

## Metrics collected

[metric-tree-cpu-time](../metrics/metric-tree-cpu-time.md), [metric-tree-private-commit](../metrics/metric-tree-private-commit.md), [metric-loaf-blocking](../metrics/metric-loaf-blocking.md), [metric-cpu-package-energy](../metrics/metric-cpu-package-energy.md)

## Hosting

The fixture is served by the harness's local fixture server. The shared hosting rules (loopback origins, scheme, cache headers, and keeping local fixtures separate from public sites) are in [ov-research-workload-catalog](../ov-research-workload-catalog.md).
