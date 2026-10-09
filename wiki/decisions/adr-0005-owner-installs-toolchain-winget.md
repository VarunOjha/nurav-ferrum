---
id: adr-0005
type: decision
title: "Owner installs the toolchain via winget; Claude supplies exact commands and verifies"
status: superseded
updated: 2026-10-08
sources:
  - raw/01-scoping-decisions.md
  - raw/research/tauri-webview2-capabilities.md
  - raw/research/nextjs-stack.md
  - raw/owner/2026-10-08-s01-wave0.md
  - raw/owner/2026-10-08-s01-wave0b.md
related: [adr-0021, adr-0006, adr-0011, adr-0016, phase-p0-planning, phase-p1-foundation, comp-app-shell, comp-interactive-plan, comp-webview2-runtime]
approvable: true
date: 2026-10-08
decided_by: owner
supersedes: []
superseded_by: adr-0021
options:
  - "Claude runs installers itself"
  - "Owner installs via winget with exact commands supplied by Claude"
  - "Containerised or devcontainer toolchain"
phase: phase-p0-planning
tags: [toolchain, environment, windows]
unverified:
  - claim: "winget id Microsoft.VisualStudio.2022.BuildTools with the VCTools workload and --includeRecommended installs MSVC link.exe plus a Windows SDK sufficient for Tauri 2.12.1"
    verify_in: phase-p1-foundation
  - claim: "The Rust stable version installed by rustup is at least 1.90 (tauri 2.12.1 rust_version)"
    verify_in: phase-p1-foundation
  - claim: "winget --version pinning works for OpenJS.NodeJS.LTS"
    verify_in: phase-p1-foundation
---

# ADR-0005: The owner installs the toolchain via winget; Claude supplies exact commands and verifies

> **Superseded by [ADR-0021](adr-0021-claude-runs-toolchain-installs.md)** (owner answer to Q-218, [raw/owner/2026-10-08-s01-wave0b.md](../raw/owner/2026-10-08-s01-wave0b.md)): Claude runs all toolchain installs, including elevated ones; kernel drivers still need separate owner approval. This page is kept unchanged below as the record of the original decision.

## Context

The environment observed on 2026-10-08 ([raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md)):

| Present | Missing |
|---|---|
| Windows 11 Pro 10.0.26200 | Rust (rustc, cargo, rustup) |
| WebView2 Runtime 154.0.4258.62 | MSVC Build Tools (`link.exe` on PATH belongs to Git) |
| Python 3.12.10 | Node.js / npm (the owner was installing Node LTS during session 1, Q13) |
| Git 2.52.0 | |

Scoping question Q2 asked who installs the toolchain. The owner answered **"Owner installs via winget (Claude supplies exact commands)"**.

Research constraints:

- tauri 2.12.1 declares `rust_version` 1.90, so the installed stable toolchain must be at least 1.90 ([raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md) §1, VERIFIED metadata).
- Node: the current LTS line is v24. **v26 becomes LTS on 2026-10-28.** The winget id `OpenJS.NodeJS.LTS` exists, and its highest manifest on 2026-10-08 was 24.20.0. After the switch date the same command will presumably install a different major ([raw/research/nextjs-stack.md](../raw/research/nextjs-stack.md) §2).
- Plan-app stack floors: Next 16 needs Node ≥ 20.9, vitest 5 needs `^22.12 || ^24 || >=26`, jsdom 30 needs `^24.15` on the 24 line, and mermaid 12 needs ≥ 22.12 (same note, §2).

## Options considered

| Option | Pros | Cons |
|---|---|---|
| A. Claude runs installers | Fewer steps for the owner | Installers need elevation and change the system. The owner explicitly chose otherwise |
| B. **Owner runs winget; Claude supplies exact commands and verifies afterwards** | The owner keeps control of system changes. Commands are reproducible and recorded in the wiki | The owner has to act. Versions resolved by `winget` can change over time (the Node LTS switch) |
| C. Container or devcontainer | Reproducible | Tauri and WebView2 GUI apps and the Windows-API benchmarks need the native Windows host. Adds complexity with no benefit here |

## Decision

### Owner decision (verbatim)

As recorded in [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md), scoping answer Q2 (that file records the owner's words verbatim-in-substance):

> Q2 Toolchain install: **Owner installs via winget** (Claude supplies exact commands)

This quoted choice is what `decided_by: owner` and `status: accepted` cover (SCHEMA §10.4 rule 3(b)).

### Claude elaboration (binding only once this ADR is APPROVED in the plan app)

Everything below in this section is Claude's elaboration of the owner's choice. Under SCHEMA §10.4 it binds implementation only after the owner approves this ADR in the plan app; until then it is a proposal.

**Option B.** The commands are Claude's proposal, recorded in the raw file. They still need owner approval of this page:

```powershell
winget install -e --id Rustlang.Rustup
winget install -e --id Microsoft.VisualStudio.2022.BuildTools --override "--quiet --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
winget install -e --id OpenJS.NodeJS.LTS
rustup default stable-msvc
```

After installation, Claude verifies **read-only** and records the exact versions in an evidence file under `wiki/raw/evidence/phase-p1-foundation/`:

```text
rustc -V ; cargo -V ; rustup show
node -v ; npm -v
where link.exe        # must resolve to the MSVC toolchain, not Git's link.exe
```

Rules:

- **Exact versions are recorded, not assumed.** The plan app's `package.json` gets an `engines` range (proposed `>=24.15 <27`, from the research note) and `.nvmrc`. Rust gets a `rust-toolchain.toml` pinned in P1.
- Claude never runs elevated installers. It may run read-only checks.
- **Never install the vulnerable WinRing0 driver.** Any kernel driver (PawnIO for energy, [ADR-0009](adr-0009-benchmark-hardware-energy.md)) needs a separate, explicit owner approval.

> **Resolved contradiction (2026-10-08):** a later owner directive widened who may install ("Feel free to run install.", [raw/owner/2026-10-08-s01-wave0.md](../raw/owner/2026-10-08-s01-wave0.md)); Claude then installed Node.js LTS v24.20.0 with winget. This was registered as [Q-218](../overview/ov-open-questions.md#q-218-who-runs-toolchain-installs-after-the-standing-install-directive), which the owner answered "Claude runs all toolchain installs" ([raw/owner/2026-10-08-s01-wave0b.md](../raw/owner/2026-10-08-s01-wave0b.md)). Resolved by DECIDE (SCHEMA §9.1.1): [ADR-0021](adr-0021-claude-runs-toolchain-installs.md) supersedes this ADR. The quoted Q2 choice above is not edited.

## Consequences

### Positive

- Every machine change is visible to the owner and recorded.
- Versions are pinned and recorded, which supports reproducibility (master prompt §10).

### Negative

- Whether the Visual Studio 2022 Build Tools id and workload flags give a toolchain sufficient for Tauri 2.12.1 is UNVERIFIED[phase-p1-foundation]. A newer Visual Studio generation may exist. This was not researched.
- Whether the installed stable Rust is ≥ 1.90 is UNVERIFIED[phase-p1-foundation]. It is almost certainly met by any current stable, but it must be observed.
- If Node is installed after 2026-10-28 it may be v26. Pinning with `winget ... --version 24.20.0` is UNVERIFIED[phase-p1-foundation]. Node v24.20.0 was installed in session s01 and the owner chose to stay on Node 24 LTS (Q-102, answered: [raw/owner/2026-10-08-s01-wave0.md](../raw/owner/2026-10-08-s01-wave0.md)).

### Follow-ups

- P1 task: toolchain verification with recorded evidence. P1 cannot exit without it.
- Tauri CLI: install `@tauri-apps/cli` 2.12.1 via npm, or `tauri-cli` 2.12.1 via cargo. Both versions exist (VERIFIED registry). The choice is made in P1 and recorded on the P1 phase page.

### Related risks and phases

- `phase-p1-foundation` (toolchain + scaffold), `phase-p0-planning` (Node for the plan app); `comp-webview2-runtime` (already present, version per raw file).

## Verification / evidence

- Owner answer Q2 and the proposed commands: [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md).
- Version floors: [raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md) §1 and [raw/research/nextjs-stack.md](../raw/research/nextjs-stack.md) §1–§2.
- Exit evidence (P1): `wiki/raw/evidence/phase-p1-foundation/toolchain-versions.txt` (path proposed) containing the output of the commands above.
