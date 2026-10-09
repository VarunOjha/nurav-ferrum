---
id: wl-large-dom
type: workload
title: "Large DOM website"
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
master_prompt_ref: 3
parameters:
  dom_nodes: 100000
  style_rules: 2000
  interactions: 30
fixture_path: benchmarks/workloads/large-dom/
equivalence_check: "Fixture reports a content hash, its fixture version and completed work units to the fixture server; a trial is valid only if these match the expected values for every configuration in the block."
phase: phase-p6-benchmark-harness
tags:
  - research
  - workload
---

# Large DOM website

**Kind:** `synthetic-local` (master prompt §9 item 3). **Status:** proposed. The fixture does not exist yet; it is built in `phase-p6-benchmark-harness`.

A page with a deterministic tree of `dom_nodes` elements (generated at build time, not at runtime) and `style_rules` CSS rules. Scripted interactions toggle classes that force style and layout work.

## Parameters (proposed; frozen at pre-registration)

| Parameter | Value |
|---|---|
| `dom_nodes` | `100000` |
| `style_rules` | `2000` |
| `interactions` | `30` |

## Script

1. Load the page and wait for the load event plus the settle time.
2. Run `interactions` scripted class toggles.
3. The fixture reports its node count (equivalence).

## Equivalence check

Fixture reports a content hash, its fixture version and completed work units to the fixture server; a trial is valid only if these match the expected values for every configuration in the block.

## Metrics collected

[metric-tree-private-commit](../metrics/metric-tree-private-commit.md), [metric-tree-cpu-time](../metrics/metric-tree-cpu-time.md), [metric-loaf-blocking](../metrics/metric-loaf-blocking.md), [metric-nav-latency](../metrics/metric-nav-latency.md)

## Hosting

The fixture is served by the harness's local fixture server. The shared hosting rules (loopback origins, scheme, cache headers, and keeping local fixtures separate from public sites) are in [ov-research-workload-catalog](../ov-research-workload-catalog.md).
