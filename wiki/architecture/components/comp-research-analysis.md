---
id: comp-research-analysis
type: component
title: "Research analysis (Python statistics, figures, reports)"
status: planned
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/research/measurement-methodology.md
related: [comp-benchmark-harness, comp-telemetry, ov-arch-repo-layout, adr-0013, phase-p6-benchmark-harness, phase-p8-research-paper, exp-lifecycle-policies, exp-baseline-footprint]
approvable: true
path: analysis/
crate: null
trust_level: trusted
phase_introduced: phase-p6-benchmark-harness
shipped: false
unsafe_code: false
responsibilities:
  - "Compare configurations on raw trial data (master prompt 4)"
  - "Calculate bootstrap confidence intervals (master prompt 4, 10)"
  - "Estimate effect sizes: Hedges g, Cliff delta, raw difference with CI (master prompt 4)"
  - "Correct for multiple comparisons (Holm or Benjamini-Hochberg)"
  - "Produce publication-quality plots (master prompt 4)"
  - "Document limitations, distinguish statistical from practical significance (master prompt 4, 10)"
  - "Generate reproducible analysis reports from wiki/raw/bench inputs only (master prompt 4)"
  - "Analyse the A/A run to establish the harness noise floor"
interfaces:
  - "analysis/scripts/<experiment>.py --run wiki/raw/bench/<run-id> --out analysis/figures/<run-id>"
connects: []
---

# comp-research-analysis

Python 3.12 is available on the machine ([scoping](../../raw/01-scoping-decisions.md)). The statistical methods follow the [measurement note §6](../../raw/research/measurement-methodology.md): SciPy bootstrap (BCa by default, with NaN handling for degenerate data), Hedges' g, Cliff's delta, Holm or Benjamini–Hochberg correction, and an A/A noise floor. Package versions are pinned in P6. Analysis reads **only** archived raw runs, never live harness output, so every figure traces back to an immutable `wiki/raw/bench/<run-id>/` (master prompt §13 traceability).

It has no outgoing `connects` edges. Its outputs are files: figures and reports consumed by `research/paper/`.
