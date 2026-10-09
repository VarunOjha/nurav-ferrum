---
id: phase-p2-fixture-review
type: phase
title: "Fixture P2 in gate review"
status: gate-review
updated: 2026-10-08
sources:
  - raw/00-fixture-source.md
related: [phase-p1-fixture-build]
approvable: true
milestone: M2
order: 2
depends_on: [phase-p1-fixture-build]
est_sessions: 3
entry_criteria:
  - "P1 exit approved"
deliverables:
  - "Reviewed fixture"
tasks:
  - id: p2.1
    title: "Collect the exit evidence"
    verify: "npm run gate"
test_gate:
  automated: ["npm run gate"]
  manual: ["Owner reviews the exit"]
  evidence: ["e2e-exit.txt", "e2e-missing.txt"]
exit_criteria:
  - "Exit evidence saved"
risks: [risk-r91]
decisions: [adr-0901]
experiments: []
---

# Fixture P2 in gate review

E2E-only phase (copied over the mini-wiki by the Playwright setup): its status is `gate-review`, so
the milestone exit approve bar is shown and `phase-p2-fixture-review#exit` can be approved.
