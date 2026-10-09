---
id: risk-r21
type: risk
title: "Results from a single AMD desktop may not generalise (external validity)"
status: open
updated: 2026-10-08
sources:
  - raw/01-scoping-decisions.md
  - raw/research/measurement-methodology.md
  - raw/research/related-work-seed.md
related: [phase-p8-research-paper, phase-p6-benchmark-harness, adr-0009, comp-research-analysis, comp-benchmark-harness, risk-r04, risk-r11, risk-r17]
approvable: true
tags: [research, external-validity, threats-to-validity]
likelihood: 5
impact: 3
mitigation: "State the single-machine scope in every result and in the threats-to-validity section; record full hardware, firmware, OS and RAM details; publish the harness, configurations and raw data so others can replicate; add a second machine only if the owner has one."
spike: null
owner_phase: phase-p8-research-paper
trigger: "Reviewers or the owner ask for generalisation; results hinge on a RAM-dependent behaviour such as Chromium's process limit."
fallback: "Restrict claims explicitly to the tested configuration."
---

# risk-r21: Results from a single AMD desktop may not generalise (external validity)

| Likelihood | Impact | Score | Status | Owner phase |
|---|---|---|---|---|
| 5 | 3 | 15 | open | `phase-p8-research-paper` |

Score = likelihood × impact (SCHEMA §6.5). Scales are planning judgements, not measurements. Full register: [ov-risk-register](ov-risk-register.md).

## Description and evidence

The owner chose this AMD desktop as the benchmark machine (adr-0009, Q6). MM §2.1 notes that Chromium's soft process limit depends on installed RAM, so process counts and memory depend on the machine. RW E4's AMD energy findings come from a Zen 2 server part and may not transfer to the owner's desktop. Intel machines, laptops on battery (where Edge energy saver and Windows E3 behave differently, MM §5.3, §6.1) and other Windows builds are out of scope unless added.

Sources: [scoping decisions](../raw/01-scoping-decisions.md), [measurement-methodology](../raw/research/measurement-methodology.md), [related-work-seed](../raw/research/related-work-seed.md). Abbreviations: TW = tauri-webview2-capabilities, MM = measurement-methodology, RW = related-work-seed, NX = nextjs-stack, LW = llm-wiki-pattern.

## Early-warning signs (trigger)

Reviewers or the owner ask for generalisation; results hinge on a RAM-dependent behaviour such as Chromium's process limit.

## Mitigation

State the single-machine scope in every result and in the threats-to-validity section; record full hardware, firmware, OS and RAM details; publish the harness, configurations and raw data so others can replicate; add a second machine only if the owner has one.

## De-risking spike (proposed)

No spike. Owner question: is a second machine (for example an Intel laptop) available for a replication run?

The `spike` frontmatter field stays `null` until the owning phase page assigns a task id (`pN.M`); the integrator or phase owner then sets it here.

## Fallback if realised

Restrict claims explicitly to the tested configuration.

## Unverified claims

None beyond the sources cited above.

## Affects

`phase-p8-research-paper`, `phase-p6-benchmark-harness`, `adr-0009`, `comp-research-analysis`, `comp-benchmark-harness`, `risk-r04`, `risk-r11`, `risk-r17`
