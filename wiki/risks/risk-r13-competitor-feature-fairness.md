---
id: risk-r13
type: risk
title: "Competitor resource-saving defaults (sleeping tabs, Startup Boost, Memory Saver, freezing) bias comparisons"
status: open
updated: 2026-10-08
sources:
  - raw/research/measurement-methodology.md
  - raw/research/related-work-seed.md
  - raw/00-master-prompt.md
related: [phase-p6-benchmark-harness, phase-p8-research-paper, comp-benchmark-harness, exp-baseline-footprint, exp-startup, exp-lifecycle-policies, exp-energy, risk-r14, risk-r17]
approvable: true
tags: [fairness, chrome, edge, benchmark]
likelihood: 4
impact: 5
mitigation: "Benchmark two framings (as-shipped defaults as headline, a matched configuration as the controlled comparison) if the owner agrees; set every relevant policy explicitly and record the effective value per trial; justify any disabled feature on measurement-validity grounds and report it; never disable a competitor feature merely to help Ferrum."
spike: null
owner_phase: phase-p6-benchmark-harness
trigger: "chrome://policy or edge://policy does not show the intended values; an msedge.exe process exists before T0; Memory Saver state differs between trials; a reviewer could call a configuration choice favourable to Ferrum."
fallback: "Report results per framing with the exact settings and leave out any comparison whose configuration cannot be defended."
unverified:
  - claim: "Chrome Memory Saver is enabled or disabled by default on this installation"
    verify_in: phase-p6-benchmark-harness
---

# risk-r13: Competitor resource-saving defaults (sleeping tabs, Startup Boost, Memory Saver, freezing) bias comparisons

| Likelihood | Impact | Score | Status | Owner phase |
|---|---|---|---|---|
| 4 | 5 | 20 | open | `phase-p6-benchmark-harness` |

Score = likelihood × impact (SCHEMA §6.5). Scales are planning judgements, not measurements. Full register: [ov-risk-register](ov-risk-register.md).

## Description and evidence

The master prompt (§8) requires equivalent workloads, viewport, network, cache, authentication, extensions, background throttling and hardware, and says **do not disable Chrome or Edge resource-saving features merely to improve Ferrum's results**. Verified defaults (MM §6.1, RW A3, A4, B1, B2):

| Feature | Default |
|---|---|
| Edge sleeping tabs | On by default |
| Edge Startup Boost | "May initially be off or on"; pre-launches Edge processes, which invalidates cold-start numbers |
| Edge energy saver | Inactive on devices with no battery |
| Chrome background tab freezing | On when the policy is unset |
| Chrome Memory Saver | Sources conflict; set explicitly by policy |
| Chrome freezing on Energy Saver | From Chrome 133, with an exemption list |

Tension to resolve with the owner: disabling Startup Boost is needed for a valid cold-start measurement but removes a feature Edge ships. It must be justified on validity grounds, reported, and ideally paired with a defaults run. Vendor savings percentages are claims, never baselines (RW).

Sources: [measurement-methodology](../raw/research/measurement-methodology.md), [related-work-seed](../raw/research/related-work-seed.md), [master prompt](../raw/00-master-prompt.md). Abbreviations: TW = tauri-webview2-capabilities, MM = measurement-methodology, RW = related-work-seed, NX = nextjs-stack, LW = llm-wiki-pattern.

## Early-warning signs (trigger)

chrome://policy or edge://policy does not show the intended values; an msedge.exe process exists before T0; Memory Saver state differs between trials; a reviewer could call a configuration choice favourable to Ferrum.

## Mitigation

Benchmark two framings (as-shipped defaults as headline, a matched configuration as the controlled comparison) if the owner agrees; set every relevant policy explicitly and record the effective value per trial; justify any disabled feature on measurement-validity grounds and report it; never disable a competitor feature merely to help Ferrum.

## De-risking spike (proposed)

Phase: `phase-p6-benchmark-harness`. Write the policy set for each framing, apply it, and capture `chrome://policy`, `edge://policy` and `chrome://settings/performance` as evidence before any campaign.

The `spike` frontmatter field stays `null` until the owning phase page assigns a task id (`pN.M`); the integrator or phase owner then sets it here.

## Fallback if realised

Report results per framing with the exact settings and leave out any comparison whose configuration cannot be defended.

## Unverified claims

- Chrome Memory Saver is enabled or disabled by default on this installation. UNVERIFIED[phase-p6-benchmark-harness]

## Affects

`phase-p6-benchmark-harness`, `phase-p8-research-paper`, `comp-benchmark-harness`, `exp-baseline-footprint`, `exp-startup`, `exp-lifecycle-policies`, `exp-energy`, `risk-r14`, `risk-r17`
