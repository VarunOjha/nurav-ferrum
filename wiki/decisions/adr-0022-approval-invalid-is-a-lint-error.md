---
id: adr-0022
type: decision
title: "APPROVAL-INVALID is a lint error; overturned owner ADRs fail ADR-CHAIN"
status: proposed
updated: 2026-10-09
sources:
  - raw/owner/2026-10-09-s01-wave0c.md
  - raw/evidence/phase-p0-planning/interactive-plan/IP-9-review-fixes.txt
related: [schema, ip-wiki-lint, ops-approval-workflow, comp-interactive-plan, phase-p0-planning]
approvable: true
date: 2026-10-09
decided_by: claude-proposed
supersedes: []
options:
  - "Keep APPROVAL-INVALID a warn until the owner adds it to SCHEMA §9.3"
  - "Make APPROVAL-INVALID an error and add it to the SCHEMA §9.3 table"
phase: phase-p0-planning
tags: [schema, lint, approvals, interactive-plan]
---

# ADR-0022: APPROVAL-INVALID is a lint error; overturned owner ADRs fail ADR-CHAIN

## Context

The IP-9 review of the plan app found two places where `npm run lint:wiki` was clean although the
approval state broke a SCHEMA rule:

1. [SCHEMA §10.3](../SCHEMA.md#103-effective-approval-state-computed-never-stored) says an `INVALID`
   approval state (page missing or `approvable: false`) is a **lint error**. The lint reported it as
   `APPROVAL-INVALID` at **warn**, because [ip-wiki-lint](../interactive-plan/ip-wiki-lint.md) §2.1 listed
   the code as a proposal and SCHEMA §9.3 says such proposals report as warn until the §9.3 table adopts
   them. So an approvals file with keys for missing or non-approvable pages, `#exit` keys on non-phase
   pages, or even a truncated (invalid JSON) `approvals.json` gave "0 errors", and SCHEMA §9.7 uses
   "LINT is clean" as an exit-gate condition. The two SCHEMA sections contradicted each other.
2. `ADR-CHAIN` accepted any `status: accepted` ADR with `decided_by: owner` and a `raw/` source
   (§10.4 rule 3(b)), even after the owner REJECTED it or requested changes in the plan app. §10.4
   rule 3 keeps such ADRs approvable precisely so the owner can overturn them, and rule 4 says a
   rejected ADR must be set to `status: rejected`.

Both are lint-semantics questions, which the owner delegated to Claude in the wave 0c answers
([raw/owner/2026-10-09-s01-wave0c.md](../raw/owner/2026-10-09-s01-wave0c.md)): decide, apply, record a
claude-proposed ADR when SCHEMA semantics change, and let the owner overturn it in the app.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| A. Keep APPROVAL-INVALID a warn until the owner adds it to §9.3 | No SCHEMA edit | Lint stays clean on a corrupt approvals file; §10.3 and §9.3 keep contradicting each other |
| B. **Make APPROVAL-INVALID an error and add it to the §9.3 table** | Matches §10.3; a corrupt or orphaned approvals file blocks the exit gate as intended | One more SCHEMA edit, which stales the `schema` approval (none exists yet) |

For ADR-CHAIN there was no real alternative: rule 4 already requires `status: rejected`, so the lint
now checks it.

## Decision

### Claude elaboration (binding only once this ADR is APPROVED in the plan app)

1. `APPROVAL-INVALID` is an **error**. SCHEMA §9.3 gains the row: an `approvals.json` key whose state is
   INVALID (§10.3), or an invalid or unreadable `approvals.json`. ip-wiki-lint moves the code from its
   §2.1 proposal table to its §2 table.
2. `ADR-CHAIN` also reports an ADR with `status: accepted` whose approval state is `REJECTED` or
   `CHANGES_REQUESTED`, whatever `decided_by` says. Case (b) of §10.4 rule 3 keeps covering an owner
   ADR while its state is `PENDING` or `STALE` (the owner has not overturned the quoted choice; a STALE
   approval is a content change, not an overturn).

## Consequences

- `npm run lint:wiki` fails (exit 1) on an approvals file with orphaned, non-approvable or misplaced
  `#exit` keys, and on an unreadable one. The plan app already failed closed for gates; now the lint
  verdict agrees.
- An owner rejection of an owner-decided ADR shows up as a lint error until the ADR is set to
  `rejected` and decided again (SCHEMA §9.4).
- The SCHEMA edit stales the `schema` approval once one exists; today `plan/approvals.json` does not
  exist, so nothing is actually stale.
- Real wiki at the time of the change: no approvals file, so no new finding.

## Verification / evidence

- Unit tests in `interactive_plan/tests/unit/lint-rules.test.ts` (severity error for every
  APPROVAL-INVALID finding; ADR-CHAIN on a rejected and a changes-requested `decided_by: owner` ADR)
  and the schema-sync test that compares the §9.3 table with the lint's severities.
- Gate output: [IP-9-review-fixes.txt](../raw/evidence/phase-p0-planning/interactive-plan/IP-9-review-fixes.txt).
