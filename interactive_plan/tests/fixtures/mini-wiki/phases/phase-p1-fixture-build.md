---
id: phase-p1-fixture-build
type: phase
title: "Fixture P1"
status: planned
updated: 2026-10-08
sources:
  - raw/00-fixture-source.md
related: [phase-p0-fixture-plan, risk-r91]
approvable: true
milestone: M1
order: 1
depends_on: [phase-p0-fixture-plan]
est_sessions: 2
entry_criteria:
  - "P0 exit approved"
deliverables:
  - "Shell"
tasks:
  - id: p1.1
    title: "Spike the shell"
    verify: "cargo test"
test_gate:
  automated: []
  manual: ["Owner opens the shell"]
  evidence: []
exit_criteria:
  - "Shell opens"
risks: [risk-r91]
decisions: [adr-0901]
experiments: [exp-fixture-startup]
components: [comp-fixture-shell, comp-fixture-content]
---

# Fixture P1

Build the shell.
