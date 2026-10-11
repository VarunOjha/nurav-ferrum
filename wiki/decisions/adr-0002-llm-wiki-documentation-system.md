---
id: adr-0002
type: decision
title: "Karpathy's LLM Wiki pattern as the documentation and decision system"
status: accepted
updated: 2026-10-11
sources:
  - raw/01-scoping-decisions.md
  - raw/research/llm-wiki-pattern.md
related: [adr-0001, adr-0003, adr-0016, schema, phase-p0-planning, comp-interactive-plan]
approvable: true
date: 2026-10-08
decided_by: owner
supersedes: []
options:
  - "Conventional docs/ folder written ad hoc"
  - "LLM Wiki pattern with index.md + grep only (plus Ferrum extensions)"
  - "LLM Wiki pattern plus a search engine (qmd) or an Obsidian vault as a hard dependency"
phase: phase-p0-planning
tags: [process, documentation, llm-wiki]
unverified: []
---

# ADR-0002: Karpathy's LLM Wiki pattern as the documentation and decision system

## Context

The owner directed: "Use Karpathy's llm-wiki for updated documentation decision making" ([raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md), directive 7).

The primary source is Karpathy's gist "LLM Wiki", summarised in [raw/research/llm-wiki-pattern.md](../raw/research/llm-wiki-pattern.md). The gist says it is "intentionally abstract. It describes the idea, not a specific implementation" (VERIFIED, note §1). The pattern has:

- three layers: immutable **raw sources**, an LLM-maintained **wiki**, and a **schema** file (the gist names `CLAUDE.md` for Claude Code);
- three operations: **ingest**, **query** and **lint**;
- an `index.md` catalogue and an append-only `log.md` with headings `## [YYYY-MM-DD] op | Title`, so `grep "^## \[" log.md | tail -5` lists the last five entries (note §3–§5).

The gist has **no** software-project example and no ADRs, approvals, phase gates or resume semantics (note §2, §4 and §7). Ferrum needs all of those. In the gist the LLM owns the wiki outright. Ferrum needs owner approval on decisions (note §7.1).

## Options considered

| Option | Pros | Cons |
|---|---|---|
| A. Conventional `docs/` folder, written ad hoc | Familiar. No conventions to learn | No persistent compounding memory across sessions. Documentation drifts from decisions. Does not satisfy the owner directive |
| B. **LLM Wiki pattern, index.md + grep only, plus clearly labelled Ferrum extensions** | Follows the owner directive and the primary source. The gist says index-only navigation works at "~100 sources, ~hundreds of pages" (note §5), which Ferrum stays below early on. Plain markdown in git, renders on GitHub, readable by the plan app | The extensions (DECIDE, HANDOFF, RESUME, PHASE-GATE, CODE, approvals, unverified-claim tags) are our design and untested. Lint is manual until a script exists |
| C. Pattern plus qmd search or Obsidian as a hard dependency | Better search and a graph view | qmd's Windows support and dependencies are unknown (note §6.5, UNCERTAIN). Obsidian is optional in the gist. Adds tooling the owner must install for no proven need |

## Decision

### Owner decision (verbatim)

As recorded in [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md), owner directive 7 (that file records the owner's words verbatim-in-substance):

> 7. "Use Karpathy's llm-wiki for updated documentation decision making."

This quoted choice is what `decided_by: owner` and `status: accepted` cover (SCHEMA §10.4 rule 3(b)).

### Claude elaboration (binding only once the owner APPROVES this ADR)

Everything below in this section is Claude's elaboration of the owner's choice. Under SCHEMA §10.4 it binds implementation only after the owner approves this ADR (given in Claude Code and recorded in `plan/approvals.json`, adr-0023); until then it is a proposal.

**Option B.**

- `wiki/raw/` is the immutable raw layer.
- The rest of `wiki/` is the LLM-maintained layer.
- The schema layer is split. `CLAUDE.md` at the repo root is the bootstrap and is auto-loaded. [`wiki/SCHEMA.md`](../SCHEMA.md) holds the full conventions, and it wins if the two conflict.

Ferrum adds these operations to the gist's three: DECIDE, HANDOFF, RESUME, PHASE-GATE and CODE. ADRs live in `wiki/decisions/`. Every extension is labelled as Ferrum's own in SCHEMA §2.

Search uses `index.md` and grep only. Obsidian MAY be used by the owner for browsing, but nothing depends on it. qmd is deferred.

**What the owner decided here vs what Claude proposed:** the owner chose the pattern (directive 7). The concrete conventions (frontmatter fields, operations, approval hashing) are Claude's proposal. They take effect through the owner's approval of the `schema` page, not through this ADR.

## Consequences

### Positive

- A fresh session with no memory can rebuild context from `CLAUDE.md` → `STATUS.md` → `log.md` → handoff → `index.md` ([ADR-0003](adr-0003-multi-session-resumability.md)).
- The interactive plan app reads `wiki/` directly, so the visualisation cannot drift from the wiki ([ADR-0016](adr-0016-interactive-plan-nextjs.md); note §6.4).
- Contradictions between research and decisions have a defined place: `> **CONTRADICTION:**` blockquotes plus an open question.

### Negative

- Code is not a raw source, so the wiki can drift from the code. The mitigation is the CODE operation and `last_verified_commit` on component pages. P1 showed a pre-commit hook can warn when code changes without its component page (`scripts/hooks/pre-commit`, [hook test](../raw/evidence/phase-p1-foundation/p1.15-hook-test.txt)); it warns rather than blocks.
- The bookkeeping overhead is real: index lines, log entries and frontmatter on every page. Until the lint script exists (a P1 deliverable), lint depends on Claude's diligence.
- It diverges from the gist on ownership: the LLM writes the pages, but owner approval decides which pages are binding.

### Follow-ups

- P1: build the lint script that implements SCHEMA §9.3, and a raw-file hash manifest (`wiki/raw/MANIFEST.sha256`).
- Re-evaluate search tooling only if index navigation becomes inadequate.

### Related risks and phases

- `phase-p0-planning` (wiki creation), `phase-p1-foundation` (lint tooling); `comp-interactive-plan`.

## Verification / evidence

- Pattern facts: [raw/research/llm-wiki-pattern.md](../raw/research/llm-wiki-pattern.md) §2–§5 (VERIFIED against the gist on 2026-10-08).
- Adoption check: the lint run at each gate reports zero errors (SCHEMA §9.3), and `grep "^## \[" wiki/log.md | tail -5` returns well-formed entries.
