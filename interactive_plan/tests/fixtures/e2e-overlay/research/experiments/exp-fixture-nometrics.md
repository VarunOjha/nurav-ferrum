---
id: exp-fixture-nometrics
type: experiment
title: "Fixture experiment without metrics"
status: designed
updated: 2026-10-08
sources:
  - raw/00-fixture-source.md
related: [exp-fixture-startup]
approvable: false
hypotheses: []
workloads: [wl-fixture-static]
configurations: [cfg-chrome]
metrics: []
trials:
  target: 30
  warmup: 3
  order: randomized
analysis: "None yet"
phase: phase-p1-fixture-build
---

# exp-fixture-nometrics

E2E-only page (IP-8): an experiment with no metrics (and not listed in any phase's `experiments`),
traceability gaps that `/research` must highlight and list. `approvable: false` keeps the dashboard's
fixed approval counts unchanged.
