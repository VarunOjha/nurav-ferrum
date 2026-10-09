---
id: phase-p0-fixture-plan
type: phase
title: "Fixture P0"
status: in-progress
updated: 2026-10-08
sources:
  - raw/00-fixture-source.md
related: [phase-p1-fixture-build, ov-fixture-project]
approvable: true
milestone: null
order: 0
depends_on: []
est_sessions: 1
entry_criteria:
  - "Owner directives recorded"
deliverables:
  - "Fixture wiki"
tasks:
  - id: p0.1
    title: "Write the loader"
    verify: "npm test"
test_gate:
  automated: ["npm test"]
  manual: []
  evidence: []
exit_criteria:
  - "Loader tests pass"
risks: []
decisions: []
experiments: []
---

# Fixture P0

Plan the fixture. Next: [P1](phase-p1-fixture-build.md).
