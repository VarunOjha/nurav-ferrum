---
id: wl-security-nav-mix
type: workload
title: "Security navigation mix (overhead workload)"
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
master_prompt_ref: null
parameters:
  navigations: 300
  blocked_fraction: 0.2
  redirect_to_blocked_fraction: 0.1
fixture_path: benchmarks/workloads/security-nav-mix/
equivalence_check: "Fixture reports a content hash, its fixture version and completed work units to the fixture server; a trial is valid only if these match the expected values for every configuration in the block."
phase: phase-p6-benchmark-harness
tags:
  - research
  - workload
---

# Security navigation mix (overhead workload)

**Kind:** `synthetic-local` (no direct master prompt §9 item). **Status:** proposed. The fixture does not exist yet; it is built in `phase-p6-benchmark-harness`.

A harmless mix of allowed navigations, blocklisted navigations, redirects to blocklisted hosts, malformed URLs and external-protocol links, all on local fixture hosts. It is used **only** to measure the performance overhead of the security engine. The correctness tests live in the quality area.

## Parameters (proposed; frozen at pre-registration)

| Parameter | Value |
|---|---|
| `navigations` | `300` |
| `blocked_fraction` | `0.2` |
| `redirect_to_blocked_fraction` | `0.1` |

## Script

1. Run the navigation list in a seeded order.
2. Record policy decisions and evaluation-latency spans.

## Equivalence check

Fixture reports a content hash, its fixture version and completed work units to the fixture server; a trial is valid only if these match the expected values for every configuration in the block.

## Metrics collected

[metric-policy-eval-latency](../metrics/metric-policy-eval-latency.md), [metric-nav-latency](../metrics/metric-nav-latency.md), [metric-tree-private-commit](../metrics/metric-tree-private-commit.md)

## Hosting

The fixture is served by the harness's local fixture server. The shared hosting rules (loopback origins, scheme, cache headers, and keeping local fixtures separate from public sites) are in [ov-research-workload-catalog](../ov-research-workload-catalog.md).
