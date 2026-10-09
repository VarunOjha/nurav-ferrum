---
id: wl-frequent-nav
type: workload
title: "Frequent navigation"
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
master_prompt_ref: 5
parameters:
  navigations: 200
  scenarios: "same-origin,cross-origin,cross-site,redirect,back-forward,cached,uncached"
  soak_hours: 2
fixture_path: benchmarks/workloads/frequent-nav/
equivalence_check: "Fixture reports a content hash, its fixture version and completed work units to the fixture server; a trial is valid only if these match the expected values for every configuration in the block."
phase: phase-p6-benchmark-harness
tags:
  - research
  - workload
---

# Frequent navigation

**Kind:** `synthetic-local` (master prompt §9 item 5). **Status:** proposed. The fixture does not exist yet; it is built in `phase-p6-benchmark-harness`.

A set of small pages on several local origins. It covers same-origin links, cross-origin and cross-site links, 301/302/307 redirect chains, back/forward and cached versus uncached loads (cache-control headers are set by the fixture server). The soak variant repeats the cycle for `soak_hours` and is used for reliability.

## Parameters (proposed; frozen at pre-registration)

| Parameter | Value |
|---|---|
| `navigations` | `200` |
| `scenarios` | `same-origin,cross-origin,cross-site,redirect,back-forward,cached,uncached` |
| `soak_hours` | `2` |

## Script

1. Run `navigations` navigations, interleaving the scenarios in a seeded random order.
2. Every destination page sends its Navigation Timing entry as a beacon.
3. Soak variant: repeat until `soak_hours` has passed while memory is sampled.

## Equivalence check

Fixture reports a content hash, its fixture version and completed work units to the fixture server; a trial is valid only if these match the expected values for every configuration in the block.

## Metrics collected

[metric-nav-latency](../metrics/metric-nav-latency.md), [metric-nav-failure-rate](../metrics/metric-nav-failure-rate.md), [metric-tree-cpu-time](../metrics/metric-tree-cpu-time.md), [metric-memory-growth-slope](../metrics/metric-memory-growth-slope.md)

## Hosting

The fixture is served by the harness's local fixture server. The shared hosting rules (loopback origins, scheme, cache headers, and keeping local fixtures separate from public sites) are in [ov-research-workload-catalog](../ov-research-workload-catalog.md).
