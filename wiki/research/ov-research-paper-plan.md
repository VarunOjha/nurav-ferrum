---
id: ov-research-paper-plan
type: overview
title: "Paper plan (title, outline, template, rules)"
status: draft
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
related:
  - ov-research-plan
  - ov-research-traceability
  - adr-0017
  - phase-p8-research-paper
approvable: true
phase: phase-p8-research-paper
tags:
  - research
  - paper
---

# Paper plan

**Working title (master prompt §13):** *Adaptive Resource Management for Chromium-Based Desktop Web Containers: Design and Experimental Evaluation* ([master prompt](../raw/00-master-prompt.md)).

| Item | Plan |
|---|---|
| Template | ACM `acmart` LaTeX class, **proposed** in `adr-0017` (status `proposed`, owner approval needed). The class option (for example a conference or journal format) depends on the venue |
| Venue | **TBD.** Candidate venues are researched in `phase-p8-research-paper`. Calls for papers, page limits and AI-use policies have to be checked against official pages at that time |
| Location | `research/paper/` (master prompt §12). Figures come from `analysis/figures/` |
| Authors | Human authors are responsible for every claim (master prompt §14). AI assistance is disclosed according to the venue's policy and `AI_USAGE.md` |
| Status | Not started. No manuscript text exists |

## Outline (master prompt §13 suggested sections, mapped to the wiki)

| # | Section | Content source | Status / rule |
|---|---|---|---|
| 1 | Abstract | Written last | Contains no numbers until Results exist |
| 2 | Introduction | [ov-research-plan](ov-research-plan.md), research questions | Motivation may cite verified vendor claims **only as vendor claims** |
| 3 | Background and Related Work | [ov-research-related-work-seed](ov-research-related-work-seed.md) plus the P8 systematic review | No novelty claim before the review |
| 4 | Research Questions | `rq-01` … `rq-07`, the pre-registered hypotheses | Pre-registration date and commit stated |
| 5 | System Architecture | The architecture area (`comp-*` pages), isolation shared-resource inventory | The architecture as implemented, not as planned |
| 6 | Adaptive Resource Management | [ov-research-configurations](ov-research-configurations.md), [ov-research-objective-function](ov-research-objective-function.md) | J explicitly not claimed novel |
| 7 | Experimental Methodology | [ov-research-fairness-protocol](ov-research-fairness-protocol.md), [ov-research-statistical-analysis-plan](ov-research-statistical-analysis-plan.md), metric and workload pages | Includes the departures (TTI replaced, soak trial count, energy support status) |
| 8 | Results | Only from `analyzed` experiments via [ov-research-traceability](ov-research-traceability.md) | **Stays EMPTY until data exists.** No placeholder numbers, no "expected" results |
| 9 | Security and Usability Tradeoffs | `exp-security-overhead`, `exp-isolation-overhead`, the security area's threat model | Correctness and performance reported separately |
| 10 | Threats to Validity | [ov-research-threats-to-validity](ov-research-threats-to-validity.md) | — |
| 11 | Related Work | See owner question R-Q13: possibly merged into section 3 | — |
| 12 | Conclusion | Only conclusions recorded on the rq pages | — |
| 13 | References | Only sources with a verified record (DOI via Crossref, or a primary page) | Every reference is re-checked in P8 |
| — | Artifact / reproducibility appendix | `REPRODUCIBILITY.md`, raw-data manifest, script hashes | — |

## Rules

1. The **Results section stays empty** until experiments have reached `analyzed` (master prompt §13; SCHEMA §7.3).
2. Every figure and table is listed in [ov-research-traceability](ov-research-traceability.md), together with its run ids and script hash.
3. No invented citations, authors, DOIs or venues. A reference enters the bib file only from a research note or literature page that has a fetched source.
4. Negative and inconclusive results are reported with the same prominence as positive ones.
5. Energy is reported as "modeled CPU-package energy" or marked unsupported, as the metric's support status dictates.
