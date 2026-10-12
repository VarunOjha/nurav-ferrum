---
id: ov-research-related-work-seed
type: overview
title: "Related-work seed (verified entries only)"
status: draft
updated: 2026-10-12
sources:
  - raw/research/literature-batch-3.md
  - raw/research/related-work-seed.md
related:
  - ov-research-plan
  - ov-research-objective-function
  - ov-research-paper-plan
  - phase-p8-research-paper
approvable: true
phase: phase-p8-research-paper
tags:
  - research
  - related-work
---

# Related-work seed: summary of VERIFIED entries

> This summarises **only the entries marked VERIFIED** in [the raw seed note](../raw/research/related-work-seed.md). Inside an entry, claims the note marks UNCERTAIN are left out. The note's "do not cite" section is left out completely. **This is not a literature review, and Ferrum's novelty is not established.** A systematic review is a `phase-p8-research-paper` deliverable and must come before any novelty claim. Vendor numbers are vendor claims and are never baselines. Where a paper's metadata was verified but its full text was not read, the relevance line says why to read it, not what it found.

## A. Chrome / Chromium tab lifecycle

| Id | Source | What was verified | Relevance to Ferrum |
|---|---|---|---|
| A1 | The Chromium Projects, "Tab Discarding and Reloading" (Chromium OS design doc) | Background tabs are discarded under low memory and reloaded on click, in a fixed priority order | Fixed-priority, recency-based discarding. Prior art for strategies 2 and 3 |
| A2 | P. Walton, "Page Lifecycle API", Chrome for Developers (updated 2023-12-01) | States Active, Passive, Hidden, Frozen, Terminated and Discarded; `document.wasDiscarded` | The web-platform contract Ferrum's states should map onto |
| A3 | F. Doray, "Freezing on Energy Saver", Chrome for Developers, 2025-01-20 | Chrome 133 freezes hidden, silent, CPU-intensive browsing-context groups, with listed exemptions | **Direct prior art** for a resource-aware policy with a safety-exemption list |
| A4 | M. Chang, Google Keyword blog, 2022-12-08 | Announces Memory Saver and Energy Saver (memory figure is a vendor claim) | A competitor feature that must be recorded per trial |

## B. Microsoft Edge sleeping tabs (vendor claims only)

| Id | Source | What was verified | Relevance |
|---|---|---|---|
| B1 | E. Huynh, Microsoft Edge Blog, 2020-12-09 | Sleeping-tab claims from telemetry on about 40,000 Canary/Dev devices. No methodology given | Motivation only. Not a baseline |
| B2 | Microsoft Edge Team, Microsoft Edge Blog, 2022-12-06 | Edge 105 sleeps high-resource tabs near the memory limit. Sleeping and discarding are distinguished | Prior art for memory-pressure-triggered, resource-ranked sleeping. Supports the sleep-versus-discard distinction |
| B3 | J. Weber, Windows Experience Blog, 2016-06-20 | Legacy EdgeHTML battery comparison (vendor lab) | Historical only. Does not apply to Chromium Edge |

## C. WebView2 official guidance

| Id | Source | What was verified | Relevance |
|---|---|---|---|
| C1 | Microsoft Learn, "Performance best practices for WebView2 apps" (ms.date 2026-01-12) | Share one environment; `MemoryUsageTargetLevel=Low`; `TrySuspendAsync`/`Resume` are best-effort; each control creates its own processes | The primitives Ferrum's lifecycle manager will call. The process-sharing statements have to be reconciled empirically (`exp-isolation-overhead`) |

## D. Browser and hybrid-app resource and energy studies

| Id | Source | Verified | Relevance |
|---|---|---|---|
| D1 | Reis, Moshchuk, Oskov, "Site Isolation", USENIX Security 2019, pp. 1661–1678 | USENIX page: title, authors, venue, pages | Why Chromium has its process count. Policies must not weaken isolation |
| D2 | Thiagarajan et al., "Who Killed My Battery?", WWW 2012, doi 10.1145/2187836.2187843 | Crossref metadata plus abstract | Methodology precedent for browser energy measurement (mobile) |
| D3 | Aloísio et al., "Energy Wars – Chrome vs. Firefox", SUSTAIN-SE @ ASE 2020 | Programme page: title, authors, venue, year. Formal publication status is uncertain, so check it before citing | Precedent for desktop browser energy comparison |
| D4 | Horn et al., "Native vs Web Apps", MOBILESoft 2023, doi 10.1109/MOBILSoft59058.2023.00013 | Crossref metadata | A template for experiment design (effect sizes, statistics) |
| D5 | Kosasih W, Engel, "Performance Comparison of Tauri and Electron…", bit-Tech 8(3) 2026, doi 10.32877/bt.v8i3.3733 | Crossref metadata plus abstract | The only Tauri-versus-Electron study found. **Do not cite its numbers**: whether it counted WebView2 child processes is unknown (`risk-r05`) |
| D6 | Chang et al., "When the Tab Comes Due", CHI 2021, doi 10.1145/3411764.3445585 | Crossref metadata only | Read it for user-side motivation for many long-lived tabs. Its findings are not verified |

## E. Energy measurement and RAPL validation

| Id | Source | Verified | Relevance |
|---|---|---|---|
| E1 | Khan et al., "RAPL in Action", ACM TOMPECS 3(2) 2018, doi 10.1145/3177754 | Crossref metadata plus abstract | Covers **Intel** RAPL only. It must not be cited as support for AMD counters |
| E2 | Hähnel et al., SIGMETRICS PER 40(3) 2012, doi 10.1145/2425248.2425252 | Crossref metadata plus abstract | Granularity limits (Intel). Informs sampling intervals |
| E3 | Hackenberg et al., IPDPSW 2015, doi 10.1109/IPDPSW.2015.70 | Crossref metadata | Template for RAPL-versus-external-reference validation |
| E4 | Schöne et al., "Energy Efficiency Aspects of the AMD Zen 2 Architecture", IEEE CLUSTER 2021, doi 10.1109/Cluster48925.2021.00087 | Crossref metadata plus full text read | On Zen 2 (EPYC 7502) the energy data is modeled, there is no DRAM domain, and the package domain under-reports compared with an external measurement. **The main input to the energy validation gate** |
| E5 | Desrochers, Paradis, Weaver, MEMSYS 2016, doi 10.1145/2989081.2989088 | Crossref metadata only | Method reference for validating a RAPL domain |
| E6 | Lipp et al., "PLATYPUS", IEEE S&P 2021, doi 10.1109/SP40001.2021.00063 | Crossref metadata plus project site | Why energy counters need privileges (`risk-r04`) |

## F. Mobile OS lifecycle analogues

| Id | Source | Verified | Relevance |
|---|---|---|---|
| F1 | AOSP, "Low Memory Killer Daemon (lmkd)" | Page read | Memory-pressure kill ranked by importance. Analogue for strategy 3 |
| F2 | Android Developers, "App Standby Buckets" | Page read | Adaptive policy based on predicted usage. Weakens any novelty claim for an "adaptive" policy |
| F3 | Apple, "Managing your app's life cycle" (UIKit) | Page read; batch 3 read Apple's "Responding to memory warnings", which says the system terminates suspended apps to reclaim memory before warning running ones ([literature-batch-3](../raw/research/literature-batch-3.md) L7) | Analogue for suspend with a snapshot, and for discard-then-shed under memory pressure |
| F4 | Lebeck et al., "End the Senseless Killing", USENIX ATC 2020, pp. 873–887 | USENIX page plus abstract | Argues that killing apps is not the only option. Supports evaluating suspend as well as discard |

## G. Cost-aware replacement (conceptual analogues)

| Id | Source | Verified | Relevance |
|---|---|---|---|
| G1 | Cao and Irani, "Cost-Aware WWW Proxy Caching Algorithms", USITS '97 | USENIX page plus abstract; the algorithm section was read in batch 3 ([literature-batch-3](../raw/research/literature-batch-3.md) L8): H = cost/size on access, offset by an inflation value L; k-competitive | **Closest template** for strategy 4. Ferrum must cite it and position itself against it |
| G2 | Young, Algorithmica 11(6) 1994, doi 10.1007/BF01189992 | Crossref metadata; batch 3 read Cao and Irani's text and reference list naming it as the origin of GreedyDual (L8) | The competitive-analysis root of cost-aware eviction and the origin of GreedyDual |
| G3 | O'Neil, O'Neil, Weikum, "LRU-K", SIGMOD 1993, doi 10.1145/170036.170081 | Crossref metadata plus abstract | Analogue for predicting tab revisits from activation history |
| G4 | Megiddo and Modha, IEEE Computer 37(4) 2004, doi 10.1109/MC.2004.1297303 | Crossref metadata | A self-tuning recency/frequency balance. Analogue for an adaptive policy |

## What this means for the research plan

1. Novelty must be argued narrowly, if at all: for example the embedded-WebView2-container setting and an open, reproducible evaluation. That comes only after the P8 review.
2. The state machine and the experiments treat **sleep** and **discard** as separate actions (B2, C1).
3. Chrome's exemption list (A3) is the starting checklist for [metric-safety-violations](metrics/metric-safety-violations.md).
4. Energy claims follow E4 and the validation gate in [metric-cpu-package-energy](metrics/metric-cpu-package-energy.md).
