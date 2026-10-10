---
id: adr-0024
type: decision
title: "The plan portal reads only plain-language JSON that Claude writes alongside the wiki"
status: accepted
updated: 2026-10-09
sources:
  - raw/owner/2026-10-09-s01-plan-app-feedback.md
  - raw/owner/2026-10-09-s01-portal-v2-decisions.md
related: [adr-0016, adr-0023, adr-0002, schema, comp-interactive-plan, ip-spec, ip-data-contract]
approvable: true
date: 2026-10-09
decided_by: owner
supersedes: []
options:
  - "Claude writes plain-language JSON in the same edit as the wiki page; the portal reads only that JSON"
  - "Portal renders the markdown wiki directly (as in ADR-0016)"
  - "A separate build step converts markdown to JSON mechanically"
phase: phase-p0-planning
tags: [interactive-plan, portal, json, pipeline]
---

# ADR-0024: The plan portal reads only plain-language JSON that Claude writes alongside the wiki

## Context

The first plan app rendered the markdown wiki directly. The owner found it "a wiki being traversed through
a web app": too technical, too long, full of internal ids
([raw/owner/2026-10-09-s01-plan-app-feedback.md](../raw/owner/2026-10-09-s01-plan-app-feedback.md)).
The wiki stays as it is, because it is Claude's working memory (ADR-0002). The owner needs a second,
plain-language view of the same facts.

## Options considered

| Option | Good | Bad |
|---|---|---|
| A. **Claude writes plain-language JSON in the same edit as each wiki change; the portal reads only the JSON** | Short, owner-oriented wording; one source of facts (the wiki) | Two files per change; drift is possible, so it needs a check |
| B. Portal renders the markdown wiki | No second copy | Exactly what the owner found hard to read |
| C. A mechanical markdown → JSON converter | No extra writing | Copies the jargon; cannot rewrite text in plain words |

## Decision

### Owner decision (verbatim)

From [raw/owner/2026-10-09-s01-plan-app-feedback.md](../raw/owner/2026-10-09-s01-plan-app-feedback.md):

> The wiki serves one purposes for LLM in the application
> It is translated to JSON that the web app renders
> You should think that there is a claude code that converts wiki to JSON and application uses JSON

> We dont need wiki to be rendered in the web app

From [raw/owner/2026-10-09-s01-portal-v2-decisions.md](../raw/owner/2026-10-09-s01-portal-v2-decisions.md):

> Source of the portal's plain-language JSON — Owner (free text): **"Create claude script right ? When you write to wiki, write to JSON, essentially an LLM pipeline internally working in this repo"**
> How the wiki→JSON step is enforced — **"Skill + safety-net hook"** — a repo skill describes the translation; Claude runs it in the same edit; a Claude Code hook blocks the end of a turn if a wiki page changed without its JSON; a check script validates JSON completeness/shape.

This quoted choice is what `decided_by: owner` and `status: accepted` cover (SCHEMA §10.4 rule 3(b)).

### Claude elaboration (binding only once the owner APPROVES this ADR)

- Wiki page changes → Claude rewrites the matching JSON in plain language in the **same edit** → the
  portal never shows stale or jargon-heavy text.
- The portal reads **only** that JSON (and may read `plan/approvals.json` for display). It never parses
  `wiki/**/*.md`.
- Enforcement has three layers: a repo skill that says how to translate; a Claude Code hook that stops the
  end of a turn when a wiki page changed without its JSON; a PowerShell check script that validates shape and
  completeness ([ADR-0025](adr-0025-check-scripts-powershell-7.md)).
- The wiki still wins on any disagreement (SCHEMA §3 precedence). A disagreement is a defect of the JSON.
- The JSON location, its shape, the skill, the hook and the check script are built in the next step of
  task p0.17 and recorded then (SCHEMA §3.4 and §4.2 get the path).

## Consequences

### Positive

- The owner reads short, plain text with clickable references instead of raw wiki pages.
- Claude's wiki keeps its full detail.

### Negative

- Every wiki edit costs a second write. Mitigation: the hook and the check script catch a missed one.
- ADR-0016's "the app reads `wiki/` directly" is replaced (ADR-0023 supersedes ADR-0016 as a whole).

## Verification / evidence

- Owner's words: the two raw files above.
- To come in p0.17: the check script passes on the real JSON, and a test shows the hook blocks a wiki change
  without its JSON.
