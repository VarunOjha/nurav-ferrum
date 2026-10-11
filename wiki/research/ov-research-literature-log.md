---
id: ov-research-literature-log
type: overview
title: "Literature reading log"
status: draft
updated: 2026-10-11
sources:
  - raw/research/related-work-seed.md
  - raw/research/literature-batch-1.md
related:
  - ov-research-literature-protocol
  - ov-research-related-work-seed
  - phase-p1-foundation
approvable: false
phase: phase-p1-foundation
tags:
  - research
  - related-work
---

# Literature reading log

One row per reading batch, following the [protocol](ov-research-literature-protocol.md). Each batch is a raw research
note; this page only tracks them. No novelty claim follows from this log.

| Batch | Phase | Date | Raw note | Covers | Open after it |
|---|---|---|---|---|---|
| 0 (seed) | P0 | 2026-10-08 | [related-work-seed.md](../raw/research/related-work-seed.md) | Chrome/Edge tab lifecycle, browser and WebView resource use, energy measurement, mobile lifecycle, cost-aware eviction | ARC original paper, Page Lifecycle report, Windows memory-pressure signal and others (its "do not cite" list) |
| 1 | P1 | 2026-10-11 | [literature-batch-1.md](../raw/research/literature-batch-1.md) | ARC (Megiddo and Modha, USENIX FAST 2003); WICG Page Lifecycle report (2022); Win32 CreateMemoryResourceNotification; WebView2 TrySuspend/Resume semantics | memory-pressure thresholds; whether WebView2 fires freeze/resume on suspend (to test in P7); rest of the seed's "do not cite" list |

## Findings worth carrying forward (from batch 1)

- WebView2 suspend is best effort, needs the view hidden, and navigation or showing the view wakes it; this matches
  spike S3 ([spike S3 report](../raw/evidence/phase-p1-foundation/spike-s3-raw-com.md)).
- Windows gives a system-wide low/high memory signal without documented thresholds on its reference page.
- ARC is the primary source for "self-tuning instead of fixed thresholds" prior art.
