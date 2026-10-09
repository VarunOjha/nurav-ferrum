---
id: ov-fixture-render
type: overview
title: "Fixture rendering cases"
status: draft
updated: 2026-10-08
sources:
  - raw/00-fixture-source.md
related: [adr-0901]
approvable: false
---

# Fixture rendering cases

E2E-only page (copied over the mini-wiki by the Playwright setup; never part of the lint fixtures).
The word zanzibarquill appears only here, so search can find a body word.

A link to a [missing page](../decisions/adr-0999-missing.md) must be styled as missing, and a link to
[the decision](../decisions/adr-0901-fixture-decision.md) must resolve.

A claim to check later UNVERIFIED[phase-p1-fixture-build] is shown as a chip.

> **CONTRADICTION:** the shell page says one process, this page says two.

<script>window.__e2ePwned = 1</script>

| Case | Expected |
|---|---|
| GFM table | rendered as a table |
| raw HTML | shown as text |
