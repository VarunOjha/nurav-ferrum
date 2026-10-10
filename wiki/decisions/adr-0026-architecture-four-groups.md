---
id: adr-0026
type: decision
title: "Architecture is presented in four groups: Application, Benchmark, Testing & quality, Research & analysis"
status: accepted
updated: 2026-10-09
sources:
  - raw/owner/2026-10-09-s01-plan-app-feedback.md
  - raw/owner/2026-10-09-s01-portal-v2-decisions.md
related: [adr-0004, adr-0024, ov-arch-system-overview, comp-app-shell, comp-tab-content, comp-webview-manager, comp-security-engine, comp-resource-manager, comp-telemetry, comp-network-logger, comp-core, comp-webview2-runtime, comp-windows-os, comp-benchmark-harness, comp-baseline-app, comp-competitor-browsers, comp-research-analysis, comp-interactive-plan, qual-testing-strategy]
approvable: true
date: 2026-10-09
decided_by: owner
supersedes: []
options:
  - "Four groups (Application, Benchmark, Testing & quality, Research & analysis), planning tooling as a footnote; lead with a layered diagram of the Rust app"
  - "One graph of every component (as in plan app v1)"
  - "Group by trust level only"
phase: phase-p0-planning
tags: [architecture, presentation, portal]
---

# ADR-0026: Architecture is presented in four groups

## Context

Plan app v1 showed every component in one graph, grouped by trust level. The owner found it
"incomprehensible" and asked to split it: the application first, then what is built around it
([raw/owner/2026-10-09-s01-plan-app-feedback.md](../raw/owner/2026-10-09-s01-plan-app-feedback.md)).
This changes how the architecture is **presented**, not the components or their connections.

## Options considered

| Option | Good | Bad |
|---|---|---|
| A. **Four groups, planning tooling as a footnote; a layered diagram of the Rust app first** | Matches how the project works: build the app, then measure and report | Each component needs a group |
| B. One graph of everything | Complete | The owner could not read it |
| C. Trust-level lanes only | Shows security boundaries | Mixes app, benchmark and research parts |

## Decision

### Owner decision (verbatim)

From [raw/owner/2026-10-09-s01-plan-app-feedback.md](../raw/owner/2026-10-09-s01-plan-app-feedback.md):

> First and foremost have a layered arch diagram of the net new RUST application we are building. You jump into components graphs - Total incomprehensible to my human mind

> Application is one, Benchmark is another, testing is another.
> It would appear the sentiment is research only.
> No it's more like create the application and then benchmark around, so several categories of components are of relevance

From [raw/owner/2026-10-09-s01-portal-v2-decisions.md](../raw/owner/2026-10-09-s01-portal-v2-decisions.md):

> Architecture grouping — **4 groups**: Application · Benchmark · Testing & quality · Research & analysis; planning tooling as a footnote. Architecture view leads with a layered diagram of the Rust app.

This quoted choice is what `decided_by: owner` and `status: accepted` cover (SCHEMA §10.4 rule 3(b)).

### Claude elaboration (binding only once the owner APPROVES this ADR)

Which component goes where (from the owner-approved Architecture mockup):

| Group | What it is for | Components and pages |
|---|---|---|
| 1. Application | What people use | Layers, top to bottom: browser controls (`comp-app-shell`); websites in tabs (`comp-tab-content`, untrusted); Ferrum engine in Rust (`comp-webview-manager`, `comp-security-engine`, `comp-resource-manager`, and measurement: `comp-telemetry`, `comp-network-logger`); shared base (`comp-core`); Microsoft WebView2 (`comp-webview2-runtime`); Windows 11 (`comp-windows-os`) |
| 2. Benchmark | Runs the same workloads on Ferrum, Chrome, Edge and a plain Tauri app, many times, in random order | `comp-benchmark-harness`, `comp-baseline-app`, `comp-competitor-browsers`; workloads `wl-*`, metrics `metric-*` |
| 3. Testing & quality | Proves each feature works and keeps working | the `qual-*` pages, test suites and check scripts ([ADR-0025](adr-0025-check-scripts-powershell-7.md)); no component of its own |
| 4. Research & analysis | Turns raw numbers into statistics, charts and the paper | `comp-research-analysis`; `rq-*`, `hyp-*`, `exp-*` |
| Footnote: planning tooling | Not part of Ferrum | `comp-interactive-plan` |

- Measurement parts (`comp-telemetry`, `comp-network-logger`) sit in the Application group because they run
  inside the app; the Benchmark group uses their output.
- Trust levels stay visible inside the Application diagram (trusted / untrusted / not ours).
- A new component page names its group in its body; the portal JSON ([ADR-0024](adr-0024-portal-reads-plain-language-json.md))
  carries the group.

## Consequences

### Positive

- The owner sees the app first and the research machinery second.

### Negative

- The grouping lives in this ADR and the portal JSON, not in component frontmatter (no schema change).
  If it ever needs to be machine-checked, a `group` field is added to SCHEMA §6.2 by a later decision.

## Verification / evidence

- Owner's words: the two raw files above; the Architecture board of the approved design mockups.
