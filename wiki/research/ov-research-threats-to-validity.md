---
id: ov-research-threats-to-validity
type: overview
title: "Threats to validity"
status: draft
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/research/measurement-methodology.md
  - raw/research/related-work-seed.md
  - raw/research/tauri-webview2-capabilities.md
related:
  - ov-research-plan
  - risk-r04
  - risk-r05
  - risk-r06
  - ov-research-statistical-analysis-plan
approvable: true
phase: phase-p8-research-paper
tags:
  - research
  - validity
---

# Threats to validity

Each threat has a mitigation and a residual risk. Many are reflected in the risk register (`risk-r04`, `risk-r05`, `risk-r06`). Sources: the [measurement note](../raw/research/measurement-methodology.md), the [related-work seed](../raw/research/related-work-seed.md) and the [Tauri/WebView2 note](../raw/research/tauri-webview2-capabilities.md).

## Construct validity (are we measuring what we claim?)

| Threat | Mitigation | Residual |
|---|---|---|
| "Memory" is ambiguous. Summed working set double-counts shared pages | Headline is tree private commit. Private working set is secondary. Working set is shown only with a caveat ([metric-tree-private-commit](metrics/metric-tree-private-commit.md)) | Private commit is not the same as the memory pressure a user perceives |
| Per-tab memory is not well-defined, because WebView2 renderers are shared across WebViews | No per-tab totals. Per-tab values are labelled "renderers hosting this tab" | Lifecycle effects are attributed per tree, not per tab |
| AMD energy is modeled, excludes DRAM and under-reports (Zen 2 evidence) | Validation gate. Label "modeled CPU-package energy". Use a wall meter if one exists. Otherwise `unsupported` | Results may not transfer from Zen 2 to the owner's CPU generation |
| "Time to interactive" is retired | Use FCP and LCP, plus LoAF for responsiveness. The substitution is stated in the paper | It departs from the master prompt's wording |
| LoAF is not a dropped-frame counter | Use PresentMon for frames and LoAF for responsiveness | The frame-miss definition is the project's own ([metric-frame-miss-rate](metrics/metric-frame-miss-rate.md)) |
| Ferrum is an app container, not a full browser. Chrome and Edge do more (sync, extensions, UI) | State that this is a comparison of resource cost for a task, not of feature parity | Readers may over-generalise |
| Embedded WebView2 may present frames through a different path | Record PresentMode. Flag a comparison that is not like-for-like | Rendering comparison may be partially invalid |

## Internal validity (is the difference caused by the product?)

| Threat | Mitigation |
|---|---|
| Order and drift effects (thermal, background OS tasks) | Randomised blocks, cool-downs, baseline checks, temperature logging |
| Processes from other apps (other WebView2 hosts, Edge Startup Boost) contaminate the process set | Job Object attribution, fresh profiles, Startup Boost off, `GetProcessExtendedInfos` cross-check |
| Auto-updates in the middle of a campaign | Record versions per trial, abort blocks on change, pin versions where possible |
| CDP instrumentation overhead and fidelity limits | The same CDP path for every product. Measure the overhead in the A/A phase |
| Window visibility changes timer resolution and EcoQoS | Fixed, visible, unoccluded windows |
| Hard-linked Edge and Evergreen WebView2 binaries share image pages | Use additive private metrics. Record the runtime mode |
| The adaptive policy is tuned on the same data it is evaluated on | Train/test seed separation, frozen at pre-registration |
| Analytic flexibility (researcher degrees of freedom) | Pre-registration, a fixed family structure, exploratory analyses labelled |

## External validity (does it generalise?)

- There is only **one machine**: an AMD desktop with no battery. Results may not transfer to laptops, Intel CPUs or other amounts of RAM. Chromium's process limit depends on RAM.
- There is one snapshot of OS and browser versions (154.x observed). Results are tied to those versions.
- The workloads are synthetic and local. Public sites are only supplementary and their content drifts.
- The activation traces are synthetic and seeded. They do not stand for real users. User studies of real tab usage exist only as motivation ([seed](../raw/research/related-work-seed.md) D6, metadata only).

## Conclusion validity

- Many comparisons are made. Holm is applied per research-question family and BH to exploratory metrics.
- With n = 30, power is low for small effects. A/A-based sample sizing is used, and results are reported as "underpowered" where that applies.
- Pseudo-replication is avoided because the trial is the unit of analysis.
- Practical significance is classified separately from statistical significance.

## Reliability and reproducibility

- Evergreen WebView2 and branded browsers cannot be re-run at the same versions later. Prefer pinnable builds and archive installers where licences allow. Owner questions R-Q2 and R-Q3.
- Raw data is immutable. Analysis scripts are deterministic and hash-recorded.

## Research integrity and AI assistance

- An AI assistant (Claude) writes much of the plan and code. The risks are fabricated facts and citations and unverified claims. Mitigations: phase-tagged unverified-claim markers (SCHEMA §7), raw research notes with access dates, citations limited to verified sources, and human approval of every claim (master prompt §14; `AI_USAGE.md`).

## Ethics

- No personal browsing data and no browser profiles are committed (master prompt §12).
- Public-site visits are low-rate and need no login.
