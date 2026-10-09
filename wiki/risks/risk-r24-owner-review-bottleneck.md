---
id: risk-r24
type: risk
title: "Owner review bottleneck and approvals going stale slow progress"
status: open
updated: 2026-10-08
sources:
  - raw/01-scoping-decisions.md
  - SCHEMA.md
related: [phase-p0-planning, adr-0014, adr-0001, comp-interactive-plan, risk-r16, risk-r22, qual-phase-gate-checklist]
approvable: true
tags: [process, governance, approvals]
likelihood: 3
impact: 2
mitigation: "Prepare one review packet per gate (pending ids, changes since the last approval, evidence links); batch planning edits so each approval goes stale at most once per round; keep doing non-dependent planning or verification work while blocked; ask questions early in ov-open-questions."
spike: null
owner_phase: phase-p0-planning
trigger: "STATUS.md shows awaiting-owner for several sessions; the same page goes STALE repeatedly."
fallback: "Agree with the owner on a smaller approval unit (for example approve a phase page and its ADRs together)."
---

# risk-r24: Owner review bottleneck and approvals going stale slow progress

| Likelihood | Impact | Score | Status | Owner phase |
|---|---|---|---|---|
| 3 | 2 | 6 | open | `phase-p0-planning` |

Score = likelihood × impact (SCHEMA §6.5). Scales are planning judgements, not measurements. Full register: [ov-risk-register](ov-risk-register.md).

## Description and evidence

The owner stops after every milestone for review (adr-0014, Q11) and approves every item before implementation (scoping directive 4). SCHEMA §10.4 makes any content edit after approval STALE, and §9.7 blocks a phase entry until its whole dependency set is approved. This is the intended safety mechanism, but it can stall work if reviews pile up.

Sources: [scoping decisions](../raw/01-scoping-decisions.md), [SCHEMA](../SCHEMA.md). Abbreviations: TW = tauri-webview2-capabilities, MM = measurement-methodology, RW = related-work-seed, NX = nextjs-stack, LW = llm-wiki-pattern.

## Early-warning signs (trigger)

STATUS.md shows awaiting-owner for several sessions; the same page goes STALE repeatedly.

## Mitigation

Prepare one review packet per gate (pending ids, changes since the last approval, evidence links); batch planning edits so each approval goes stale at most once per round; keep doing non-dependent planning or verification work while blocked; ask questions early in ov-open-questions.

## De-risking spike (proposed)

No spike.

The `spike` frontmatter field stays `null` until the owning phase page assigns a task id (`pN.M`); the integrator or phase owner then sets it here.

## Fallback if realised

Agree with the owner on a smaller approval unit (for example approve a phase page and its ADRs together).

## Unverified claims

None beyond the sources cited above.

## Affects

`phase-p0-planning`, `adr-0014`, `adr-0001`, `comp-interactive-plan`, `risk-r16`, `risk-r22`, `qual-phase-gate-checklist`
