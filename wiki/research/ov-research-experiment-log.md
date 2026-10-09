---
id: ov-research-experiment-log
type: overview
title: "Experiment log (append-only)"
status: draft
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/research/measurement-methodology.md
related:
  - ov-research-plan
  - ov-research-statistical-analysis-plan
approvable: false
tags:
  - research
  - log
---

# Experiment log

Master prompt §14 asks for an experiment log covering design decisions, hypotheses, failed experiments and later revisions ([master prompt](../raw/00-master-prompt.md)). This page is **append-only**. New entries go at the end and existing entries are never edited. A correction is a new entry that references the earlier one. Each entry also gets a line in `wiki/log.md` (op `plan`, `decide` or `code`).

## Entry template

```markdown
### [YYYY-MM-DD] <kind> | <short title>
- session: sNN
- kind: design | prereg | pilot | aa-validation | run | failure | abort | revision | analysis
- experiments: [exp-...]
- hypotheses: [hyp-...]
- run_ids: [raw/bench/<run-id>/ ...]   # empty if no run
- what: <what was done or decided>
- why: <reason; link sources>
- outcome: <observed outcome with raw links, or "none (no run)">
- deviations: <deviations from pre-registration, or "none">
- next: <next step>
```

## Entries

### [2026-10-08] design | Research plan drafted in P0. No experiments run
- session: s01
- kind: design
- experiments: [exp-baseline-footprint, exp-startup, exp-navigation, exp-rendering, exp-energy, exp-reliability, exp-security-overhead, exp-isolation-overhead, exp-lifecycle-policies]
- hypotheses: [hyp-01 … hyp-15] (all `draft`)
- run_ids: []
- what: Wrote the research questions, the candidate hypotheses for pre-registration, the experiment designs, metric definitions, workloads, the fairness protocol, the statistical analysis plan and the threats to validity.
- why: Phase P0 is planning only. The owner approves the plan before any implementation ([scoping decisions](../raw/01-scoping-decisions.md)).
- outcome: none (no run). **No experiments have been executed and no measurements exist.**
- deviations: none. Two deliberate departures from the master prompt are proposed. "Time to interactive" is replaced by FCP/LCP plus LoAF because TTI is retired upstream (measurement note §4.2). The reliability soak uses 10 trials instead of 30 (owner question R-Q12).
- next: Owner review of the research pages in the plan app. Answer the open questions R-Q1 to R-Q14 ([ov-research-plan](ov-research-plan.md)).
