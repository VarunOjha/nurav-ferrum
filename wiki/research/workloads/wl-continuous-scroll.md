---
id: wl-continuous-scroll
type: workload
title: "Continuous scrolling"
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
master_prompt_ref: 4
parameters:
  scroll_duration_s: 60
  px_per_frame: 8
  page_height_px: 200000
fixture_path: benchmarks/workloads/continuous-scroll/
equivalence_check: "Fixture reports a content hash, its fixture version and completed work units to the fixture server; a trial is valid only if these match the expected values for every configuration in the block."
phase: phase-p6-benchmark-harness
tags:
  - research
  - workload
---

# Continuous scrolling

**Kind:** `synthetic-local` (master prompt §9 item 4). **Status:** proposed. The fixture does not exist yet; it is built in `phase-p6-benchmark-harness`.

A long page of mixed text and images (all local). The page itself scrolls programmatically at a fixed number of pixels per animation frame, so no input injection is needed and the work is identical across products.

## Parameters (proposed; frozen at pre-registration)

| Parameter | Value |
|---|---|
| `scroll_duration_s` | `60` |
| `px_per_frame` | `8` |
| `page_height_px` | `200000` |

## Script

1. Load the page and settle.
2. Start the in-page scroll driver for `scroll_duration_s`.
3. Capture PresentMon output for the product's GPU process for the whole phase.

## Equivalence check

Fixture reports a content hash, its fixture version and completed work units to the fixture server; a trial is valid only if these match the expected values for every configuration in the block.

## Metrics collected

[metric-frame-interval](../metrics/metric-frame-interval.md), [metric-frame-miss-rate](../metrics/metric-frame-miss-rate.md), [metric-loaf-blocking](../metrics/metric-loaf-blocking.md), [metric-tree-cpu-time](../metrics/metric-tree-cpu-time.md)

## Hosting

The fixture is served by the harness's local fixture server. The shared hosting rules (loopback origins, scheme, cache headers, and keeping local fixtures separate from public sites) are in [ov-research-workload-catalog](../ov-research-workload-catalog.md).
