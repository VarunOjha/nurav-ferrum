---
id: ops-environment-setup
type: operations
title: "Environment setup: toolchain install (winget), verification, PATH"
status: draft
updated: 2026-10-09
sources:
  - raw/01-scoping-decisions.md
  - raw/research/nextjs-stack.md
  - raw/research/tauri-webview2-capabilities.md
  - raw/owner/2026-10-08-s01-wave0.md
  - raw/owner/2026-10-08-s01-wave0b.md
related: [adr-0021, adr-0005, adr-0011, phase-p1-foundation, comp-webview2-runtime, comp-interactive-plan, ops-session-protocol, ov-open-questions]
approvable: true
audience: both
trigger: "Before P0 plan-app work (Node), before P1 (Rust, MSVC), on a new machine, or when a tool is reported missing."
tags: [toolchain, winget, windows, path]
unverified:
  - claim: "rustc's MSVC target finds the MSVC linker without a Developer Prompt, even from Git Bash where /usr/bin/link shadows link.exe"
    verify_in: phase-p1-foundation
  - claim: "The VCTools workload with --includeRecommended also installs a Windows SDK sufficient for Tauri"
    verify_in: phase-p1-foundation
  - claim: "vswhere.exe query below reports the VC tools installation"
    verify_in: phase-p1-foundation
  - claim: "winget pin can stop OpenJS.NodeJS.LTS moving to a new major on upgrade"
    verify_in: phase-p1-foundation
---

# Environment setup

**Claude runs all toolchain installs** (winget, npm, rustup, pip), including elevated ones such as the
MSVC Build Tools; the owner clicks through the UAC prompts. Kernel drivers (for example an
energy-measurement driver) still need a separate, explicit owner approval. This is the owner's answer to
Q-218 ([raw/owner/2026-10-08-s01-wave0b.md](../raw/owner/2026-10-08-s01-wave0b.md)), recorded in
[ADR-0021](../decisions/adr-0021-claude-runs-toolchain-installs.md), which supersedes adr-0005 (owner
decision Q2, "Owner installs via winget", [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md)).
Node LTS was installed by Claude in session s01 under the earlier standing directive "Feel free to run
install." ([raw/owner/2026-10-08-s01-wave0.md](../raw/owner/2026-10-08-s01-wave0.md)). Claude records the
exact installed versions as evidence after every install.

## 1. Current state

| Item | State | Source |
|---|---|---|
| OS | Windows 11 Pro 10.0.26200 x64 | raw scoping record |
| Git | 2.52.0.windows.1 | raw scoping record |
| Python | 3.12.10 (no PyYAML) | raw scoping record; PyYAML absence observed in s01 |
| WebView2 Runtime | 154.0.4258.62 | raw scoping record; re-read from the registry in s01 (same value) |
| Edge / Chrome | 154.0.4258.x / 154.0.8037.x | raw scoping record |
| Node.js / npm | **Installed** by Claude on the owner's authorisation (`winget install -e --id OpenJS.NodeJS.LTS`): `node.exe` v24.20.0 in `C:\Program Files\nodejs`. **Not on the default PATH of the Claude Code Bash shell**: prepend it with `export PATH="/c/Program Files/nodejs:$PATH"` in every Bash call. The owner chose to stay on Node 24 LTS (Q-102). npm version: see the IP-0 evidence | [raw/owner/2026-10-08-s01-wave0.md](../raw/owner/2026-10-08-s01-wave0.md); `raw/evidence/phase-p0-planning/interactive-plan/IP-0-toolchain.txt` (p0.9) |
| Rust (rustup/rustc/cargo) | **Not installed** (`rustc` not found; `%USERPROFILE%\.cargo\bin` absent) | raw scoping record; re-checked in s01 |
| MSVC Build Tools | **Not installed** (`C:\Program Files (x86)\Microsoft Visual Studio\Installer\` absent) | raw scoping record; re-checked in s01 |
| winget | Present (v1.29.380) | Observed in s01 |

The s01 observations above should be captured as a raw environment record at the start of P1
(`wiki/raw/evidence/phase-p1-foundation/environment.md`), because SCHEMA §7.5 requires versions to cite a
raw record.

## 2. Install commands (Claude runs these in PowerShell)

Exact commands from the raw scoping record (Claude defaults proposed in session 1):

```powershell
winget install -e --id Rustlang.Rustup
winget install -e --id Microsoft.VisualStudio.2022.BuildTools --override "--quiet --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
winget install -e --id OpenJS.NodeJS.LTS
rustup default stable-msvc
```

Notes:

- Node is already installed (24.20.0). Do **not** run the Node line again, and avoid `winget upgrade --all`
  without checking: Node 26 becomes LTS on 2026-10-28, after which `OpenJS.NodeJS.LTS` may resolve to a
  new major ([raw/research/nextjs-stack.md](../raw/research/nextjs-stack.md) §2). The owner answered Q-102:
  stay on Node 24 LTS for now; moving to 26 needs its own ADR ([raw/owner/2026-10-08-s01-wave0.md](../raw/owner/2026-10-08-s01-wave0.md)).
  A winget pin (`winget pin add --id OpenJS.NodeJS.LTS`) may prevent the move `UNVERIFIED[phase-p1-foundation]`.
- The Build Tools install is large, needs elevation (the owner confirms the UAC prompt) and may need a
  reboot. Claude tells the owner before starting it.
- `rustup default stable-msvc` must run in a **new** terminal opened after the rustup install, so that
  `rustup` is on PATH.
- Tauri 2.12.1 requires Rust ≥ 1.90 ([raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md)).
  `stable` satisfies this if rustup installs a current stable; the check below confirms it.
- The Tauri CLI choice (npm `@tauri-apps/cli` 2.12.1 vs `cargo install tauri-cli --version 2.12.1 --locked`)
  is made in P1; both versions are recorded in the Tauri research note.
- Benchmark-time tools (PresentMon, LibreHardwareMonitor/PawnIO, Chrome for Testing, WebView2 Fixed
  Version) are **not** installed now. They need owner decisions (admin rights, drivers) recorded in
  [ov-open-questions](../overview/ov-open-questions.md) and are planned for P5/P6.

## 3. Verification commands

Run after installing, in a **new** terminal. Claude records the output as evidence in P1.

PowerShell:

```powershell
node --version                      # expect v24.x (stack floor >= 24.15 on the 24 line, per nextjs-stack note)
npm --version
rustup --version
rustup show active-toolchain        # expect stable-x86_64-pc-windows-msvc
rustc --version                     # expect >= 1.90
cargo --version
& "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe" -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
reg query "HKLM\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" /v pv
python --version
git --version
```

The `vswhere` line is `UNVERIFIED[phase-p1-foundation]` (standard location, not yet checked here).
The `reg query` line was run in s01 and returned `pv REG_SZ 154.0.4258.62`; the output is saved as [raw/evidence/phase-p0-planning/env-webview2-pv.txt](../raw/evidence/phase-p0-planning/env-webview2-pv.txt).

The definitive check that Rust + MSVC + WebView2 work together is P1's smoke build (a hello-world crate,
then a minimal Tauri app), not these version commands.

## 4. PATH notes: Git Bash vs PowerShell

- **Running processes keep their old PATH.** winget updates the PATH in the registry, but Claude Code, its
  Bash tool and already-open terminals do not see the change. Observed in s01: Node was on the machine
  PATH but `node` was "command not found" in the session. Fix: **restart Claude Code** (open a new
  terminal and start a new session) after any install.
- **Workaround inside an old session (Git Bash).** Claude's Bash tool does not keep environment
  variables between calls, so prefix each command:
  `export PATH="/c/Program Files/nodejs:$HOME/.cargo/bin:$PATH"; node --version`
  (`$HOME` is the Git Bash spelling of the Windows user folder `<USERPROFILE>`, whose name contains a space; always quote paths containing spaces. Real values are masked in committed files, adr-0027.)
- **Workaround inside an old session (PowerShell).**
  `$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')`
- **Linker shadowing.** In Git Bash, `/usr/bin/link` (coreutils) is found before MSVC's `link.exe`; the raw
  record notes that the `link.exe` on PATH is Git's. Whether `cargo build` in Git Bash still finds the MSVC
  linker is `UNVERIFIED[phase-p1-foundation]`. Until verified, run Rust and Tauri builds from PowerShell.
- **Which shell for what.** winget and installers: PowerShell (Claude runs them; owner confirms UAC). `grep`/`sed`/log recipes and the
  wiki scripts: Git Bash. npm/Next.js: either. Cargo/Tauri: PowerShell until the linker question is settled.
- **Python output in Git Bash** has CRLF line endings; strip `\r` when capturing it.
- **Paths with spaces.** The repo is under `<USERPROFILE>\Documents\Projects\...` (the user folder name contains a space). Quote every path. Whether
  `create-next-app` handles it is a P0 plan-app check ([raw/research/nextjs-stack.md](../raw/research/nextjs-stack.md) §6, item 1).

## 5. Interactive plan app prerequisites

Node 24.20.0 meets every floor in the recommended stack (Next 16 ≥ 20.9, vitest 5, jsdom 30 ≥ 24.15 on
the 24 line, mermaid 12 ≥ 22.12) per [raw/research/nextjs-stack.md](../raw/research/nextjs-stack.md) §2.
The scaffold command and pinned versions are in the interactive-plan pages (`ip-spec`).
