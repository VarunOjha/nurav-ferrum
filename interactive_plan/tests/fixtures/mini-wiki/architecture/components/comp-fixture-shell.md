---
id: comp-fixture-shell
type: component
title: "Fixture shell"
status: planned
updated: 2026-10-08
sources:
  - raw/00-fixture-source.md
related: [comp-fixture-content, phase-p1-fixture-build]
approvable: true
path: src/shell/
crate: null
trust_level: trusted
phase_introduced: phase-p1-fixture-build
responsibilities:
  - "Hosts the content"
connects:
  - to: comp-fixture-content
    label: "creates"
    kind: rust-api
    crosses_trust_boundary: true
interfaces: [open_tab]
shipped: false
---

# Fixture shell

Hosts [the content](comp-fixture-content.md).
