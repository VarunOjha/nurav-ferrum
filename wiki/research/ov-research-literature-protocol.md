---
id: ov-research-literature-protocol
type: overview
title: "Literature review protocol"
status: draft
updated: 2026-10-11
sources:
  - raw/research/related-work-seed.md
  - raw/research/literature-batch-1.md
  - raw/00-master-prompt.md
related:
  - ov-research-literature-log
  - ov-research-related-work-seed
  - ov-research-plan
  - ov-research-paper-plan
  - phase-p1-foundation
  - phase-p7-lifecycle
  - phase-p8-research-paper
approvable: true
phase: phase-p1-foundation
tags:
  - research
  - related-work
  - protocol
---

# Literature review protocol

How Ferrum's literature review is run, from P1 (task p1.14) until it closes in P7 (p7.12), before any novelty claim in
the paper (P8). The seed list ([ov-research-related-work-seed](ov-research-related-work-seed.md)) is the starting
point; each reading batch is a raw research note, and [the reading log](ov-research-literature-log.md) tracks them.

## 1. Questions the review answers

1. **Tab lifecycle prior art:** how browsers and embedded web views freeze, sleep and discard background pages, and on
   which signals (idle time, memory pressure, cost).
2. **Adaptive eviction:** which self-tuning or cost-aware replacement policies (caching, OS memory management) are close
   analogues of an adaptive tab policy.
3. **Embedded web view resource use:** published measurements of WebView2, Electron or Tauri memory, CPU and energy.
4. **Measurement method:** how browser and app resource use and energy are measured reliably on Windows and AMD hardware.
5. **Platform contracts:** the web-platform and OS signals Ferrum can use (Page Lifecycle, Windows memory-pressure
   notifications, WebView2 suspend APIs).

## 2. Where to search

- Digital libraries: ACM Digital Library, IEEE Xplore, USENIX proceedings, arXiv; metadata confirmed through Crossref
  (`https://api.crossref.org/works/<DOI>`).
- Primary technical sources: W3C/WICG specifications, Chromium and Microsoft documentation and engineering blogs,
  Android and Apple platform documentation.
- Snowballing: references of, and citations to, every included paper.

## 3. Search strings (starting set)

- `tab discarding browser memory`, `page lifecycle freeze discard`, `background tab throttling energy`
- `adaptive replacement cache`, `cost-aware eviction`, `GreedyDual`, `LRU-K`
- `WebView2 OR Electron OR "embedded browser" memory overhead`, `browser energy measurement`
- `RAPL AMD accuracy`, `memory pressure notification Windows`

Each batch records the strings it used in its raw note.

## 4. Inclusion and exclusion

- **Include:** peer-reviewed papers; official specifications and platform documentation; vendor engineering posts only
  as descriptions of shipped behaviour (their numbers are vendor claims, never baselines).
- **Exclude:** press articles and blogs with unverified method; sources that cannot be fetched; anything known only
  from memory or a search snippet (listed as UNCERTAIN until fetched).

## 5. Verification rule

- No citation without a fetched primary page or a Crossref record. Title, authors, venue and year must match the
  source; DOIs are copied from Crossref or the publisher, never typed from memory.
- Each claim in a note is labelled **VERIFIED** (read in the primary source this session) or **UNCERTAIN**.
- Every note gives its access date. Wiki pages cite the note, not the URL.
- Novelty is never claimed from the review alone; the owner approves the novelty assessment (p7.12).

## 6. Cadence

One small batch per phase (P1 to P6), recorded in [the reading log](ov-research-literature-log.md); the review closes
in P7 (p7.12).
