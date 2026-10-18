---
id: risk-r20
type: risk
title: "Dependency and toolchain churn (Tauri 3, Node LTS switch, TypeScript and ESLint majors, Mermaid 12)"
status: open
updated: 2026-10-18
sources:
  - raw/research/tauri-webview2-capabilities.md
  - raw/research/nextjs-stack.md
  - raw/01-scoping-decisions.md
related: [phase-p1-foundation, phase-p0-planning, adr-0005, adr-0021, adr-0011, adr-0016, comp-interactive-plan, comp-app-shell, risk-r02, risk-r03, qual-ci-plan]
approvable: true
tags: [dependencies, toolchain, versions]
likelihood: 4
impact: 3
mitigation: "Pin exact versions and commit lockfiles (Cargo.lock, package-lock.json); pin the Rust toolchain in a toolchain file; record installed tool versions in a raw environment record at P1; set an engines range for Node; upgrade dependencies only as explicit tasks that re-run the full test gate; run dependency audits in CI."
spike: null
owner_phase: phase-p1-foundation
trigger: "A fresh install resolves different versions from the lockfile; npm install fails with peer-dependency errors; winget installs a different Node major; a Tauri 2.x release changes an unstable API; cargo-deny or cargo-audit reports an advisory."
fallback: "Roll back to the last recorded working versions and treat the upgrade as its own planned task."
unverified:
  - claim: "winget install with an explicit --version pins Node 24.x after Node 26 becomes LTS"
    verify_in: phase-p5-telemetry
---

# risk-r20: Dependency and toolchain churn (Tauri 3, Node LTS switch, TypeScript and ESLint majors, Mermaid 12)

| Likelihood | Impact | Score | Status | Owner phase |
|---|---|---|---|---|
| 4 | 3 | 12 | open | `phase-p1-foundation` |

Score = likelihood × impact (SCHEMA §6.5). Scales are planning judgements, not measurements. Full register: [ov-risk-register](ov-risk-register.md).

## Description and evidence

Verified facts that make churn likely during a multi-month project:

- tauri 2.12.1 needs Rust 1.90 or newer; Tauri 3.0.0-alpha.4 exists and changes `add_child` (TW §1).
- Ferrum's `webview2-com` and `windows` must stay on the majors tauri uses (0.39 / 0.62) (TW §1).
- Node 26 becomes LTS on 2026-10-28, so `winget install OpenJS.NodeJS.LTS` may then install a different major than today (NX §2).
- `typescript@latest` (7.x) and `eslint@latest` (10.x) are outside what eslint-config-next 16.4.0 declares support for (NX §1.1).
- Mermaid 12.0.0 is a new breaking major; 11.17.2 is the mature alternative (NX §4).
- gray-matter was last published in 2021 (NX §1).

Claude installs the toolchain via winget, the owner confirming UAC prompts (adr-0021, superseding adr-0005). Rust and the MSVC Build Tools were not installed on 2026-10-08 (scoping decisions).

Sources: [tauri-webview2-capabilities](../raw/research/tauri-webview2-capabilities.md), [nextjs-stack](../raw/research/nextjs-stack.md), [scoping decisions](../raw/01-scoping-decisions.md). Abbreviations: TW = tauri-webview2-capabilities, MM = measurement-methodology, RW = related-work-seed, NX = nextjs-stack, LW = llm-wiki-pattern.

## Early-warning signs (trigger)

A fresh install resolves different versions from the lockfile; npm install fails with peer-dependency errors; winget installs a different Node major; a Tauri 2.x release changes an unstable API; cargo-deny or cargo-audit reports an advisory.

## Mitigation

Pin exact versions and commit lockfiles (Cargo.lock, package-lock.json); pin the Rust toolchain in a toolchain file; record installed tool versions in a raw environment record at P1; set an engines range for Node; upgrade dependencies only as explicit tasks that re-run the full test gate; run dependency audits in CI.

## De-risking spike (proposed)

Phase: `phase-p1-foundation`. Install the toolchain with the recorded commands, record every resulting version in a raw environment record, and run a clean build of each project from its lockfile on a second checkout.

The `spike` frontmatter field stays `null` until the owning phase page assigns a task id (`pN.M`); the integrator or phase owner then sets it here.

## Fallback if realised

Roll back to the last recorded working versions and treat the upgrade as its own planned task.

## Unverified claims

- winget install with an explicit --version pins Node 24.x after Node 26 becomes LTS. UNVERIFIED[phase-p5-telemetry] (re-targeted in P4: P4 ended on 2026-10-18, before 2026-10-28; re-targeted in P3: P3 ended before 2026-10-28; re-targeted in P2: Node 26 is not LTS before 2026-10-28; re-targeted in P1: 24.20.0 is listed as installable today, but the claim can only be checked after Node 26 becomes LTS on 2026-10-28).

## Affects

`phase-p1-foundation`, `phase-p0-planning`, `adr-0005`, `adr-0021`, `adr-0011`, `adr-0016`, `comp-interactive-plan`, `comp-app-shell`, `risk-r02`, `risk-r03`, `qual-ci-plan`
