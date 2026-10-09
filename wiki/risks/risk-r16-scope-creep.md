---
id: risk-r16
type: risk
title: "Scope creep across two equally weighted goals (usable app and research)"
status: open
updated: 2026-10-08
sources:
  - raw/01-scoping-decisions.md
  - raw/00-master-prompt.md
related: [phase-p0-planning, adr-0004, adr-0001, adr-0014, phase-p2-minimal-container, phase-p3-tabs-sessions, phase-p8-research-paper, risk-r24, qual-definition-of-done]
approvable: true
tags: [process, scope, planning]
likelihood: 4
impact: 4
mitigation: "Freeze each phase's deliverables at approval; route any new feature to a backlog note or an ADR the owner approves; defer master-prompt items marked as later (split view); time-box spikes; at each milestone review, compare actual sessions with est_sessions and re-plan explicitly."
spike: null
owner_phase: phase-p0-planning
trigger: "Tasks added to an in-progress phase without approval; a phase exceeding its est_sessions noticeably; UI polish displacing research tasks, or the reverse."
fallback: "Cut back to the master-prompt milestone deliverables and move everything else to a later phase with owner approval."
---

# risk-r16: Scope creep across two equally weighted goals (usable app and research)

| Likelihood | Impact | Score | Status | Owner phase |
|---|---|---|---|---|
| 4 | 4 | 16 | open | `phase-p0-planning` |

Score = likelihood × impact (SCHEMA §6.5). Scales are planning judgements, not measurements. Full register: [ov-risk-register](ov-risk-register.md).

## Description and evidence

The owner set the goal as a usable app **and** a rigorous research framework, equally, developed in lock-step (adr-0004, Q1). The master prompt lists a wide feature set (sidebar, settings, split view in a later phase, downloads, per-site settings, session restore) alongside nine benchmark dimensions, ten workloads, five configurations and a paper. With two equal goals there is no automatic tie-breaker, so each phase gate (adr-0001, adr-0014) is where scope is controlled.

Sources: [scoping decisions](../raw/01-scoping-decisions.md), [master prompt](../raw/00-master-prompt.md). Abbreviations: TW = tauri-webview2-capabilities, MM = measurement-methodology, RW = related-work-seed, NX = nextjs-stack, LW = llm-wiki-pattern.

## Early-warning signs (trigger)

Tasks added to an in-progress phase without approval; a phase exceeding its est_sessions noticeably; UI polish displacing research tasks, or the reverse.

## Mitigation

Freeze each phase's deliverables at approval; route any new feature to a backlog note or an ADR the owner approves; defer master-prompt items marked as later (split view); time-box spikes; at each milestone review, compare actual sessions with est_sessions and re-plan explicitly.

## De-risking spike (proposed)

No spike. Control point: the exit review of each phase (`<phase-id>#exit` approval) includes a scope check against the frozen deliverables.

The `spike` frontmatter field stays `null` until the owning phase page assigns a task id (`pN.M`); the integrator or phase owner then sets it here.

## Fallback if realised

Cut back to the master-prompt milestone deliverables and move everything else to a later phase with owner approval.

## Unverified claims

None beyond the sources cited above.

## Affects

`phase-p0-planning`, `adr-0004`, `adr-0001`, `adr-0014`, `phase-p2-minimal-container`, `phase-p3-tabs-sessions`, `phase-p8-research-paper`, `risk-r24`, `qual-definition-of-done`
