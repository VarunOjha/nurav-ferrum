---
id: risk-r17
type: risk
title: "Novelty of the adaptive lifecycle policy is not established; prior art is substantial"
status: open
updated: 2026-10-08
sources:
  - raw/research/related-work-seed.md
  - raw/00-master-prompt.md
related: [phase-p8-research-paper, phase-p7-lifecycle, comp-research-analysis, comp-resource-manager, exp-lifecycle-policies, adr-0017, risk-r13, risk-r21]
approvable: true
tags: [research, novelty, literature]
likelihood: 4
impact: 4
mitigation: "Run a systematic literature review in P8 before any novelty claim; position explicitly against the seed prior art; frame the contribution only as far as the review supports (for example an open, reproducible evaluation in a WebView2 container setting, to be confirmed); report negative or null results honestly."
spike: null
owner_phase: phase-p8-research-paper
trigger: "The review finds a published evaluation equivalent to Ferrum's; manuscript drafts contain words like 'novel' or 'first' without a citation-backed justification."
fallback: "Reframe the paper as an experience and measurement study, or a replication-style comparison, without a novelty claim."
---

# risk-r17: Novelty of the adaptive lifecycle policy is not established; prior art is substantial

| Likelihood | Impact | Score | Status | Owner phase |
|---|---|---|---|---|
| 4 | 4 | 16 | open | `phase-p8-research-paper` |

Score = likelihood × impact (SCHEMA §6.5). Scales are planning judgements, not measurements. Full register: [ov-risk-register](ov-risk-register.md).

## Description and evidence

The master prompt (§6, §13, §14) forbids assuming the objective function or policy is novel and requires a literature review first. The seed list (RW) already finds close prior art:

- Chrome 133 freezes hidden, silent, CPU-intensive tabs, with an explicit exemption list (A3).
- Edge 105 sleeps high-resource tabs under memory pressure and distinguishes sleep from discard (B2).
- Chromium OS tab discarding uses a fixed priority order (A1).
- Android App Standby Buckets may use machine learning to predict app use (F2); lmkd discards under memory pressure (F1).
- GreedyDual-Size combines cost, size and recency (G1); LRU-K and ARC are adaptive replacement analogues (G3, G4).

RW states plainly that novelty is **not** established and the full review belongs to P8.

Sources: [related-work-seed](../raw/research/related-work-seed.md), [master prompt](../raw/00-master-prompt.md). Abbreviations: TW = tauri-webview2-capabilities, MM = measurement-methodology, RW = related-work-seed, NX = nextjs-stack, LW = llm-wiki-pattern.

## Early-warning signs (trigger)

The review finds a published evaluation equivalent to Ferrum's; manuscript drafts contain words like 'novel' or 'first' without a citation-backed justification.

## Mitigation

Run a systematic literature review in P8 before any novelty claim; position explicitly against the seed prior art; frame the contribution only as far as the review supports (for example an open, reproducible evaluation in a WebView2 container setting, to be confirmed); report negative or null results honestly.

## De-risking spike (proposed)

No spike. The P8 literature review is the resolution; the seed list is its starting point, not its substitute.

The `spike` frontmatter field stays `null` until the owning phase page assigns a task id (`pN.M`); the integrator or phase owner then sets it here.

## Fallback if realised

Reframe the paper as an experience and measurement study, or a replication-style comparison, without a novelty claim.

## Unverified claims

None beyond the sources cited above.

## Affects

`phase-p8-research-paper`, `phase-p7-lifecycle`, `comp-research-analysis`, `comp-resource-manager`, `exp-lifecycle-policies`, `adr-0017`, `risk-r13`, `risk-r21`
