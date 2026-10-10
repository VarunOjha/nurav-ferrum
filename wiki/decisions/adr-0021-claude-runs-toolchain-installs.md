---
id: adr-0021
type: decision
title: "Claude runs all toolchain installs, including elevated ones; kernel drivers need separate owner approval"
status: accepted
updated: 2026-10-09
sources:
  - raw/owner/2026-10-08-s01-wave0b.md
  - raw/owner/2026-10-08-s01-wave0.md
  - raw/01-scoping-decisions.md
  - raw/research/tauri-webview2-capabilities.md
  - raw/research/nextjs-stack.md
related: [adr-0005, adr-0009, adr-0011, adr-0016, phase-p0-planning, phase-p1-foundation, ops-environment-setup, ov-open-questions, comp-webview2-runtime, comp-interactive-plan]
approvable: true
date: 2026-10-08
decided_by: owner
supersedes: [adr-0005]
options:
  - "Claude runs non-elevated installs; the owner keeps elevated installers and drivers"
  - "Claude runs all toolchain installs including elevated ones; drivers need separate approval"
  - "Keep adr-0005 as written (owner runs every winget install)"
phase: phase-p1-foundation
tags: [toolchain, environment, windows]
unverified:
  - claim: "winget id Microsoft.VisualStudio.2022.BuildTools with the VCTools workload and --includeRecommended installs MSVC link.exe plus a Windows SDK sufficient for Tauri 2.12.1"
    verify_in: phase-p1-foundation
---

# ADR-0021: Claude runs all toolchain installs, including elevated ones; kernel drivers need separate owner approval

## Context

[ADR-0005](adr-0005-owner-installs-toolchain-winget.md) recorded the owner's scoping answer Q2: "Owner
installs via winget (Claude supplies exact commands)". In session s01 the owner then gave the standing
directive "Feel free to run install.", and Claude installed Node.js LTS (v24.20.0) with winget on that
authorisation ([raw/owner/2026-10-08-s01-wave0.md](../raw/owner/2026-10-08-s01-wave0.md)). The
contradiction was registered as
[Q-218](../overview/ov-open-questions.md#q-218-who-runs-toolchain-installs-after-the-standing-install-directive)
(SCHEMA §9.1.1). It held P1 entry, because P1 installs Rust and the MSVC Build Tools.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| A. Claude runs non-elevated installs; owner keeps elevated installers and drivers | Owner controls every admin-level change | Owner must run the MSVC Build Tools install by hand |
| B. **Claude runs all toolchain installs, including elevated ones; drivers need separate approval** | Fewest owner steps; commands and versions are still recorded | Elevated changes start from Claude (the owner still confirms each UAC prompt) |
| C. Keep adr-0005 (owner runs every winget install) | Most conservative | Contradicts the owner's later directive |

## Decision

### Owner decision (verbatim)

As recorded in [raw/owner/2026-10-08-s01-wave0b.md](../raw/owner/2026-10-08-s01-wave0b.md), answer to Q-218:

> **"Claude runs all toolchain installs"** — Claude runs winget/npm/rustup/pip installs, including MSVC Build Tools (owner clicks through UAC prompts). Kernel drivers (e.g. energy-measurement driver) still require separate owner approval. adr-0005 is superseded.

This quoted choice is what `decided_by: owner` and `status: accepted` cover (SCHEMA §10.4 rule 3(b)).

### Claude elaboration (binding only once the owner APPROVES this ADR)

- The install commands are those of [ops-environment-setup §2](../operations/ops-environment-setup.md#2-install-commands-claude-runs-these-in-powershell)
  (the same commands adr-0005 proposed). Claude runs them in PowerShell. When a command triggers a UAC
  prompt, Claude tells the owner beforehand and waits for the result; the owner clicks through the prompt.
- Before each install Claude writes the STATUS In-flight record (SCHEMA §9.5) and afterwards records the
  exact installed versions under `wiki/raw/evidence/<phase-id>/` (for P1: `toolchain.txt`). Versions are
  recorded, never assumed.
- Node stays on the 24 line (Q-102). Claude does not run `winget upgrade --all` or any command that moves
  a pinned major.
- **Kernel drivers** (for example PawnIO for energy measurement, [ADR-0009](adr-0009-benchmark-hardware-energy.md))
  are not covered: each needs a separate, explicit owner approval recorded in `wiki/raw/owner/`. The
  vulnerable WinRing0 driver is never installed.
- Benchmark-time tools that need admin rights at run time (an elevated energy sampler) are decided by
  their own questions (Q-123), not by this ADR.

## Consequences

### Positive

- P1 toolchain setup (p1.1) no longer waits for the owner to run commands; only UAC confirmation is needed.
- Every install is still logged with exact versions, which supports reproducibility.

### Negative

- Whether the Visual Studio 2022 Build Tools id and workload flags give a toolchain sufficient for
  Tauri 2.12.1 is UNVERIFIED[phase-p1-foundation] (carried over from adr-0005).
- Claude-initiated elevated installs change the machine; the evidence file is the audit trail.

### Related risks and phases

- `phase-p1-foundation` (p1.1 toolchain install); `phase-p6-benchmark-harness` (drivers, separate approval).

## Verification / evidence

- Owner answer: [raw/owner/2026-10-08-s01-wave0b.md](../raw/owner/2026-10-08-s01-wave0b.md).
- Earlier directive and the Node install: [raw/owner/2026-10-08-s01-wave0.md](../raw/owner/2026-10-08-s01-wave0.md).
- P1 evidence: `wiki/raw/evidence/phase-p1-foundation/toolchain.txt` (p1.1).
