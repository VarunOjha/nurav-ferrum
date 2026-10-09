---
id: ov-fixture-project
type: overview
title: "Fixture project overview"
status: review
updated: 2026-10-08
sources:
  - raw/00-fixture-source.md
related: [comp-fixture-shell, comp-fixture-content, phase-p0-fixture-plan, adr-0901]
approvable: true
audience: both
tags: [fixture]
---

# Fixture project overview

The fixture project has a trusted shell and untrusted content. See
[the decision](../decisions/adr-0901-fixture-decision.md#decision) and the
[shell component](../architecture/components/comp-fixture-shell.md).

```mermaid
flowchart LR
  comp_fixture_shell["Shell"] -.->|TB| comp_fixture_content["Content"]
```

## Structure of `the` *fixture*

| Part | Trust |
|---|---|
| Shell | trusted |
| Content | untrusted |
