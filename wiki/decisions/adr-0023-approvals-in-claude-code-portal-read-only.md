---
id: adr-0023
type: decision
title: "The owner approves in Claude Code; Claude records approvals with change detection; the plan portal is read-only"
status: accepted
updated: 2026-10-09
sources:
  - raw/owner/2026-10-09-s01-plan-app-feedback.md
  - raw/owner/2026-10-09-s01-portal-v2-decisions.md
  - raw/01-scoping-decisions.md
related: [adr-0016, adr-0024, adr-0014, adr-0022, schema, ops-approval-workflow, comp-interactive-plan, phase-p0-planning, ip-spec, ip-approvals-api]
approvable: true
date: 2026-10-09
decided_by: owner
supersedes: [adr-0016]
options:
  - "Owner approves in Claude Code; Claude records the decision with fingerprints (content hash) and history"
  - "Owner approves in Claude Code; Claude keeps only a log entry, no approvals file"
  - "Keep approving by clicking in the plan app (adr-0016)"
phase: phase-p0-planning
tags: [approvals, interactive-plan, portal]
---

# ADR-0023: The owner approves in Claude Code; Claude records approvals; the portal is read-only

## Context

Until now the owner was meant to approve pages by clicking in the plan app, and only the app could write
`plan/approvals.json` ([ADR-0016](adr-0016-interactive-plan-nextjs.md)). After using the app, the owner
said this does not fit how he works: he steers the project in Claude Code, and the plan app is a place
to look things up, not to act
([raw/owner/2026-10-09-s01-plan-app-feedback.md](../raw/owner/2026-10-09-s01-plan-app-feedback.md)).

## Options considered

| Option | Good | Bad |
|---|---|---|
| A. **Owner approves in Claude Code → Claude records it in `plan/approvals.json` with page fingerprints and history** | One place to talk and decide; later edits are still caught (STALE) | Claude now writes the approvals file, so the owner's words must be saved first as proof |
| B. Owner approves in Claude Code → Claude only writes a log entry | Simplest | No fingerprint, so a later edit of an approved page goes unnoticed |
| C. Keep clicking Approve in the app | Already built | Owner does not want to act in the app |

## Decision

### Owner decision (verbatim)

From [raw/owner/2026-10-09-s01-plan-app-feedback.md](../raw/owner/2026-10-09-s01-plan-app-feedback.md):

> Okay one more thing we need to change is that Approval will be given on claude code cli only. Interactive plan doesn't mean that plan dashboard is where you get the approval.
> This interactive_plan we are building is for me to track the larger scope of how we are executing things. It's completely readonly. To adjust I will interact with Claude code only
> So page approval doesn't make sense

From [raw/owner/2026-10-09-s01-portal-v2-decisions.md](../raw/owner/2026-10-09-s01-portal-v2-decisions.md), question "How Claude records approvals given in Claude Code":

> **"I record, with change detection"** — when the owner approves in Claude Code, Claude writes the approval to the approvals file with a fingerprint (content hash) of the page; later edits make it show as outdated and Claude re-asks before dependent work. Owner's exact words are also saved in the wiki. (Supersedes the rule that only the plan app writes approvals.)

This quoted choice is what `decided_by: owner` and `status: accepted` cover (SCHEMA §10.4 rule 3(b)).

### Claude elaboration (binding only once the owner APPROVES this ADR)

How an approval is recorded, step by step (SCHEMA §10.1, [ops-approval-workflow](../operations/ops-approval-workflow.md)):

1. Owner says in Claude Code what he approves (or wants changed, or rejects) → Claude saves his words
   verbatim to `wiki/raw/owner/YYYY-MM-DD-<slug>.md` → there is proof of who decided what.
2. Claude runs `python tools/approvals_record.py <key> <decision> --source <that file>` → the script stores
   the decision with the page's `content_hash` and `scope_hash` (and `bootstrap_hash` of `CLAUDE.md` for
   `schema`), moves any earlier decision into `history`, and writes the file atomically → change detection
   works exactly as before (APPROVED, APPROVED_VOLATILE_DRIFT, STALE).
3. Claude appends an `approval` log entry naming the key and the raw file.

Never: Claude records an approval the owner did not give; Claude counts a subagent or script message as an
approval; a decision without its raw transcription.

What changes in the plan portal (`interactive_plan/`):

- It is **read-only**. No Approve / Request changes buttons, no `/api/approvals` write route, no inbox for
  acting. It may *show* approval states read from `plan/approvals.json`.
- Kept from ADR-0016: a local Next.js app in `interactive_plan/`, served on 127.0.0.1 only, with the
  ADR-0016 stack pins as the starting point. What it reads is decided by [ADR-0024](adr-0024-portal-reads-plain-language-json.md).

## Consequences

### Positive

- The owner decides in one place (Claude Code) and looks things up in another (the portal).
- Fingerprints still catch edits after approval, so the phase gates keep their meaning.
- The portal has no write path, which removes the approval API's attack surface.

### Negative

- Claude now writes `plan/approvals.json`. Mitigation: only through `tools/approvals_record.py`, only with a
  raw transcription of the owner's words, and every change is logged and in git.
- The app's approval UI and API (IP-4, IP-7) become dead code; the portal rebuild (task p0.17) removes them.

### Follow-ups

- SCHEMA §10.1 writer rule, CLAUDE.md §8 and ops-approval-workflow rewritten (2026-10-09, same change).
- Portal v2 (p0.17) drops the approve bar, the inbox actions and `app/api/approvals`.

## Verification / evidence

- Owner's words: the two raw files above.
- `tools/test_approvals_record.py`: records with hashes, keeps history, adds `bootstrap_hash` for `schema`,
  refuses non-approvable pages, `#exit` on non-phase pages and decisions without an owner raw file, and
  `tools/approvals_check.py` reads the result (APPROVED, then STALE after an edit).
