---
id: comp-competitor-browsers
type: component
title: "Google Chrome and Microsoft Edge (external benchmark targets)"
status: planned
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/research/measurement-methodology.md
  - raw/research/related-work-seed.md
related: [comp-benchmark-harness, ov-arch-configuration, risk-r05, risk-r06, phase-p6-benchmark-harness, exp-baseline-footprint, exp-startup, exp-navigation, exp-rendering, exp-energy]
approvable: true
path: null
crate: null
trust_level: external
phase_introduced: phase-p6-benchmark-harness
shipped: false
external_version: "Chrome 154.0.8037.x; Edge 154.0.4258.x (observed 2026-10-08, raw/01-scoping-decisions.md)"
responsibilities:
  - "Benchmark configurations cfg-chrome (A) and cfg-edge (B) per master prompt 8"
  - "Run with as-shipped resource-saving features (never disabled to favour Ferrum, master prompt 8); policies recorded per trial"
interfaces:
  - "Command-line launch with fresh --user-data-dir; CDP via remote debugging port (Playwright connectOverCDP)"
connects: []
---

# comp-competitor-browsers (external)

A modelling node for configurations A and B. Fairness controls come from the [measurement note §5](../../raw/research/measurement-methodology.md) and the [related-work note](../../raw/research/related-work-seed.md):

- Edge sleeping tabs are on by default, and Edge Startup Boost invalidates cold starts, so both are recorded or controlled by policy;
- Chrome background-tab freezing is a default;
- Chrome Memory Saver's default is unclear, so it is set explicitly by policy;
- Chrome for Testing vs branded Chrome with updates blocked is an open owner question.

Vendor percentages are never used as baselines.
