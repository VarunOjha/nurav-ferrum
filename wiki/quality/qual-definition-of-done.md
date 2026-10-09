---
id: qual-definition-of-done
type: quality
title: "Definition of done (task, component change, experiment, phase, session)"
status: draft
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/research/measurement-methodology.md
related: [qual-testing-strategy, qual-phase-gate-checklist, qual-ci-plan, qual-security-testing-plan, ov-risk-register, adr-0001, adr-0003, adr-0011, adr-0014, phase-p0-planning, phase-p1-foundation, phase-p8-research-paper, comp-interactive-plan, risk-r15, risk-r16, risk-r18]
approvable: true
phase: phase-p0-planning
tags: [quality, definition-of-done, process]
scope: [all]
test_kinds: [unit, integration, e2e, security, benchmark-validation, build, lint, manual, ci]
tooling:
  - "cargo fmt, cargo clippy, cargo test"
  - "npm run lint:wiki"
  - "git (local commits only when adr-0011 authorises them)"
---

# Definition of done

"Done" means the same thing in every session. A fresh session with no memory checks an item against the list for its level below. If any box is unticked, the item is **not done** and `STATUS.md` must say so. Sources: master prompt §14 to §17 ([master prompt](../raw/00-master-prompt.md)), owner directives ([scoping decisions](../raw/01-scoping-decisions.md)), SCHEMA §9.

The levels nest: a phase is done only when all its tasks are done; a session ends cleanly only when the session checklist is complete.

## 1. Task (`pN.M`)

- [ ] The phase's entry gate passed (SCHEMA §9.7) and the task belongs to that phase's approved task list. Work outside the list needs owner approval first (risk-r16).
- [ ] The task's `verify` condition from the phase page was **executed and observed** in this repo state. The command and its output are saved (as evidence if the task is a gate item).
- [ ] New or changed behaviour has tests at the right layer ([qual-testing-strategy](qual-testing-strategy.md)); a bug fix has a test that failed before the fix.
- [ ] Static checks pass locally: formatting, `clippy -D warnings` for Rust; eslint and typecheck for TypeScript; the Python linter for analysis code.
- [ ] No new `unsafe` without a `// SAFETY:` comment and an update to the component page's `## Unsafe invariants` (risk-r18).
- [ ] No secrets, browser profiles, private tokens or real browsing logs are staged (master prompt §12).
- [ ] Every new technical claim in docs is sourced or carries an inline unverified tag naming its verification phase (SCHEMA §7), with a matching `unverified:` frontmatter entry.
- [ ] The affected component page is updated in the same change (SCHEMA §9.8): responsibilities, `connects`, `interfaces`, `last_verified_commit` once implemented.
- [ ] `STATUS.md` updated (current task, next action) and a `code` (or other fitting) entry appended to `wiki/log.md` naming the task id (SCHEMA §9.5 continuous checkpointing, risk-r15).
- [ ] If local commits are authorised (adr-0011), the task is committed as one commit whose message names the task id. Claude never pushes.

## 2. Component change

In addition to the task list:

- [ ] Public interfaces are documented on the component page and match the code.
- [ ] Trust-boundary edges (`crosses_trust_boundary: true`) are covered by at least one test that sends hostile input across the boundary.
- [ ] Errors are explicit (`Result` with typed errors), logged with `tracing`, and never swallowed (master prompt §15).
- [ ] Any optimisation has an associated benchmark or a planned experiment id that will demonstrate its effect (master prompt §15).
- [ ] Dependency additions are justified in the task log entry and pass `cargo-deny` / `cargo-audit` or the npm audit step ([qual-ci-plan](qual-ci-plan.md)).

## 3. Security-relevant change

- [ ] The relevant SEC tests in [qual-security-testing-plan](qual-security-testing-plan.md) pass, and a new attack surface gets a new SEC test first.
- [ ] No capability file gains a `remote` section; no browser argument weakens security (static check SEC-12).
- [ ] The threat-model section of `comp-security-engine` states what is and is not enforced after the change.

## 4. Experiment (`exp-*`)

- [ ] Hypotheses, primary metrics, comparison families, practical thresholds, trial counts, warm-up and ordering were written and owner-approved **before** data collection (hypothesis status `preregistered`).
- [ ] The harness validation checks for every metric used passed ([qual-testing-strategy](qual-testing-strategy.md) section 5).
- [ ] Raw outputs are stored unmodified under `wiki/raw/bench/<run-id>/` with full metadata, including failed and aborted trials (master prompt §10: no cherry-picking).
- [ ] Analysis is a script, re-runnable with fixed seeds, and its output matches the committed summary.
- [ ] The experiment page links `results_ref`; hypotheses move to a verdict status only through that link (SCHEMA §6.7).
- [ ] Unsupported metrics are marked `support: unsupported` with the reason, never estimated (master prompt §7 Energy).

## 5. Phase

- [ ] Every task in the phase meets section 1.
- [ ] The exit checklist in [qual-phase-gate-checklist](qual-phase-gate-checklist.md) is complete, with evidence under `wiki/raw/evidence/<phase-id>/`.
- [ ] Risks owned by this phase are re-scored and their status updated with evidence ([ov-risk-register](../risks/ov-risk-register.md)).
- [ ] Unverified tags (SCHEMA §7) that targeted this phase are resolved or re-targeted with a logged reason (no `UNV-PASTDUE`).
- [ ] Root summary files (README, PLAN, ARCHITECTURE, RESEARCH_PLAN, AI_USAGE) reflect the phase result where relevant.
- [ ] The owner approved `<phase-id>#exit` in the plan app (adr-0014). Only then does the phase status become `done`.

## 6. Research artefact (paper section, figure, citation)

- [ ] Every number traces to a `raw/bench/` run through an analysis script.
- [ ] Every citation was checked against a fetched primary source recorded in a research note; no invented authors, DOIs or venues (master prompt §13, §14).
- [ ] No novelty claim without a literature review that supports it (risk-r17).
- [ ] AI assistance for the artefact is recorded in `AI_USAGE.md` (master prompt §14).

## 7. Session

Before stopping, or when the context is running low (SCHEMA §9.5):

- [ ] Wiki lint run (or its quick subset when context is short) and the result logged.
- [ ] Handoff written to `wiki/operations/handoffs/handoff-YYYY-MM-DD-sNN.md` with an exact next action.
- [ ] `STATUS.md` updated: session, current phase and task, next action, blocked_on, last_handoff.
- [ ] Uncommitted paths listed in the handoff if not committed.
