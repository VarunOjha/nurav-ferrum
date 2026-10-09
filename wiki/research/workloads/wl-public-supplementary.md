---
id: wl-public-supplementary
type: workload
title: "Supplementary public websites"
status: proposed
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/research/measurement-methodology.md
  - raw/research/tauri-webview2-capabilities.md
related:
  - ov-research-workload-catalog
  - comp-benchmark-harness
  - exp-navigation
  - exp-baseline-footprint
approvable: true
workload_kind: public-real-world
master_prompt_ref: null
parameters:
  sites: TBD-owner-approval
  visits_per_site: 1
  login: none
fixture_path: TBD-owner-approved-site-list
equivalence_check: "Fixture reports a content hash, its fixture version and completed work units to the fixture server; a trial is valid only if these match the expected values for every configuration in the block."
phase: phase-p6-benchmark-harness
tags:
  - research
  - workload
---

# Supplementary public websites

**Kind:** `public-real-world` (no direct master prompt §9 item). **Status:** proposed. The fixture does not exist yet; it is built in `phase-p6-benchmark-harness`.

A small set of public websites that represent real-world use. It is supplementary only: results are reported separately and never pooled with the controlled local workloads (master prompt §9). No site may need a login. Google sign-in flows are excluded because embedded user agents may not run Google OAuth.

## Parameters (proposed; frozen at pre-registration)

| Parameter | Value |
|---|---|
| `sites` | `TBD-owner-approval` |
| `visits_per_site` | `1` |
| `login` | `none` |

## Script

1. Visit each site once per trial in a seeded order and dwell for a fixed time.
2. Record the page weight and request count (from the network log) so content drift between trials can be detected.

## Equivalence check

Fixture reports a content hash, its fixture version and completed work units to the fixture server; a trial is valid only if these match the expected values for every configuration in the block.

## Metrics collected

[metric-tree-private-commit](../metrics/metric-tree-private-commit.md), [metric-nav-latency](../metrics/metric-nav-latency.md), [metric-tree-cpu-time](../metrics/metric-tree-cpu-time.md)

## Hosting

The fixture is served by the harness's local fixture server. The shared hosting rules (loopback origins, scheme, cache headers, and keeping local fixtures separate from public sites) are in [ov-research-workload-catalog](../ov-research-workload-catalog.md).
