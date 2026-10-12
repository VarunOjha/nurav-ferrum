---
id: ov-research-literature-log
type: overview
title: "Literature reading log"
status: draft
updated: 2026-10-11
sources:
  - raw/research/related-work-seed.md
  - raw/research/literature-batch-1.md
  - raw/research/literature-batch-2.md
related:
  - ov-research-literature-protocol
  - ov-research-related-work-seed
  - phase-p1-foundation
  - phase-p2-minimal-container
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
| 2 | P2 | 2026-10-11 | [literature-batch-2.md](../raw/research/literature-batch-2.md) | WebView2 process model (Microsoft Learn); Chromium process model and site isolation (Chromium docs); Reis, Moshchuk, Oskov (USENIX Security 2019); Reis and Gribble (EuroSys 2009, metadata only); Edge sleeping tabs post (2022, vendor claim); Chrome tab discarding post (2015, historical); Horn et al. (MOBILESoft 2023, abstract); Thangadurai et al. (QUATIC 2024, full text) | overhead numbers in the body of the 2019 paper; today's Chrome Memory Saver rules; any WebView2 resource study on Windows |

## Findings worth carrying forward (from batch 1)

- WebView2 suspend is best effort, needs the view hidden, and navigation or showing the view wakes it; this matches
  spike S3 ([spike S3 report](../raw/evidence/phase-p1-foundation/spike-s3-raw-com.md)).
- Windows gives a system-wide low/high memory signal without documented thresholds on its reference page.
- ARC is the primary source for "self-tuning instead of fixed thresholds" prior art.

## Findings worth carrying forward (from batch 2)

- WebView2 groups processes by user data folder: one browser process per folder and identical environment options,
  renderers shared across views by site. The accounting unit for Ferrum is that process group.
- Desktop Chromium isolates sites (scheme plus eTLD+1) per renderer process under a memory-based soft limit, so a
  benchmark must fix the site mix, not only the tab count.
- The closest desktop prior work (Electron versus web, QUATIC 2024) ran on Linux and measured memory as per-process
  RSS; its numbers are not comparable to Ferrum's planned metric.
- The seed list's snippet about the Edge sleeping-tabs post was wrong (date and numbers); the post itself states
  savings without a method, so it is a vendor claim only.
