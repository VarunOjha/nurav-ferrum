---
id: exp-fixture-startup
type: experiment
title: "Fixture startup experiment"
status: designed
updated: 2026-10-08
sources:
  - raw/00-fixture-source.md
related: [hyp-91, phase-p1-fixture-build]
approvable: true
hypotheses: [hyp-91]
workloads: [wl-fixture-static]
configurations: [cfg-chrome, cfg-ferrum-adaptive]
metrics: [metric-fixture-startup-ms]
trials:
  target: 30
  warmup: 3
  order: randomized
analysis: "Bootstrap CI of the median difference"
phase: phase-p1-fixture-build
unverified:
  - claim: "The timer API is precise enough"
    verify_in: phase-p1-fixture-build
---

# Fixture startup experiment

The timer API is precise enough UNVERIFIED[phase-p1-fixture-build].
