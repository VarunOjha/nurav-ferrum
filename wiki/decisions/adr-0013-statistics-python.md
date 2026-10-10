---
id: adr-0013
type: decision
title: "Statistics, analysis and plots in Python"
status: accepted
updated: 2026-10-09
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/research/measurement-methodology.md
related: [adr-0012, adr-0009, adr-0004, phase-p6-benchmark-harness, phase-p7-lifecycle, phase-p8-research-paper, comp-research-analysis, exp-baseline-footprint, exp-lifecycle-policies]
approvable: true
date: 2026-10-08
decided_by: owner
supersedes: []
options:
  - "Python (SciPy-based) analysis scripts and notebooks"
  - "R"
  - "Rust or TypeScript analysis"
phase: phase-p0-planning
tags: [statistics, analysis, python, reproducibility]
unverified:
  - claim: "SciPy 1.18.0 (version noted in research) installs on Python 3.12.10 on this machine; plotting library choice (e.g. matplotlib) and its version"
    verify_in: phase-p6-benchmark-harness
  - claim: "Holm 1979 (Scandinavian Journal of Statistics 6(2)) citation details; Crossref lookup failed"
    verify_in: phase-p8-research-paper
---

# ADR-0013: Statistics, analysis and plots in Python

## Context

The master prompt requires analysis of mean, median, standard deviation, p95, confidence intervals (bootstrap where appropriate), effect sizes, relative differences and uncertainty. It also asks for publication-quality plots and reproducible analysis reports ([raw/00-master-prompt.md](../raw/00-master-prompt.md) §3, §4 "Research Analysis", §10), and it lists "Python for statistical analysis and visualizations" in the environment (§3).

The owner confirmed this with Q10: "analysis/statistics remain Python" ([raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md)). Python 3.12.10 is installed (same raw file).

Methodology research ([raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md) §7):

- **Bootstrap defaults.** SciPy `scipy.stats.bootstrap` defaults to BCa with 9999 resamples at a 0.95 confidence level. BCa can return NaN for degenerate data. VERIFIED.
- **Effect sizes and corrections.** Report Hedges' g, Cliff's delta, and the raw difference with its CI. Correct for multiple comparisons with Holm or Benjamini–Hochberg. DOIs for Hedges, Cliff and Benjamini–Hochberg VERIFIED via Crossref metadata. The Holm 1979 citation is UNVERIFIED[phase-p8-research-paper] (the Crossref lookup failed, methodology note §7.5).
- **Statistical power.** With 30 trials per arm, two-sided α = 0.05 and 80 % power, the minimum detectable effect is d ≈ 0.72 (DERIVED, normal approximation). At α = 0.005 it is ≈ 0.94.
- **Design controls.** Randomized blocks, an A/A noise-floor test, and pre-registered primary metrics and practical-significance thresholds.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| A. **Python (SciPy, NumPy, pandas-or-equivalent, a plotting library)** | Named in the master prompt. Owner's choice. Already installed. SciPy's bootstrap is documented | Version pinning and environment management needed. Notebooks can hide state |
| B. R | Strong statistics ecosystem | Not installed. Not the owner's choice |
| C. Rust or TypeScript | Same language as the harness | Weak statistics and plotting ecosystems. Higher error risk |

## Decision

### Owner decision (verbatim)

As recorded in [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md), scoping answer Q10 (that file records the owner's words verbatim-in-substance):

> Q10 Playwright script language: **Node/TypeScript** (analysis/statistics remain Python)

This quoted choice is what `decided_by: owner` and `status: accepted` cover (SCHEMA §10.4 rule 3(b)).

### Claude elaboration (binding only once the owner APPROVES this ADR)

Everything below in this section is Claude's elaboration of the owner's choice. Under SCHEMA §10.4 it binds implementation only after the owner approves this ADR (given in Claude Code and recorded in `plan/approvals.json`, adr-0023); until then it is a proposal.

**Option A.** `comp-research-analysis` lives under `analysis/` ([ADR-0018](adr-0018-repo-root-cargo-workspace.md)).

1. **Scripts are canonical, notebooks are not.** Analysis is **scripts first** (`analysis/scripts/`): deterministic and command-line-driven, reading only `benchmarks/results/<run-id>/` or `wiki/raw/bench/<run-id>/`. Notebooks (`analysis/notebooks/`) are for exploration only. Published figures and tables come from scripts.
2. **Seeds are recorded.** Every bootstrap call fixes and records its RNG seed. When BCa is degenerate, fall back to percentile and report the fallback.
3. **Reporting set per comparison:**
   - n, mean, median, SD, p95 (p99 only where n supports it);
   - raw difference with a 95 % bootstrap CI, and the ratio;
   - Hedges' g and Cliff's delta;
   - the corrected p-value or q-value within the pre-registered family;
   - an explicit "practically meaningful?" verdict against the pre-registered threshold.
4. **Pinned environment.** Use a venv with exact pins (`requirements.txt`, optionally with hashes). The environment tool is open question Q-121 ([ov-open-questions](../overview/ov-open-questions.md)); the recommended default is the standard-library `venv` plus `pip` with an exact-pinned `requirements.txt`, so no extra installer is needed. Python and package versions are recorded in every analysis output.
5. **No cherry-picking.** Analysis consumes **all** trials of a run. Exclusions only follow pre-registered rules, and every excluded trial is listed with its reason.

## Consequences

### Positive

- Analysis is reproducible from raw data with a single command, which supports master prompt §13 traceability (data → analysis → figure).
- Statistical choices are explicit and pre-registered, which reduces researcher degrees of freedom.

### Negative

- A third language joins Rust and TypeScript, so there is another environment to pin.
- **30 trials may not be enough.** If variance is high, 30 trials per arm may not detect small but practically relevant differences. The A/A noise floor may call for more blocks, and sequential stopping must be pre-registered.
- Whether SciPy 1.18.0 installs on this Python is UNVERIFIED[phase-p6-benchmark-harness]. The plotting library choice is also open there.

### Follow-ups

- P6: create the analysis environment, implement the A/A analysis, and write the pre-registration template that hypothesis and experiment pages reference.
- P7 and P8: comparative analyses, figures for the paper, and threats-to-validity inputs.

### Related risks and phases

- Phases: `phase-p6-benchmark-harness`, `phase-p7-lifecycle`, `phase-p8-research-paper`.
- Experiments: all, in particular `exp-baseline-footprint` and `exp-lifecycle-policies`.

## Verification / evidence

- Owner answer Q10: [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md).
- Methods: [raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md) §7.
- P6 evidence: the analysis environment lock file plus an A/A analysis report that reruns byte-identically with the recorded seed.
