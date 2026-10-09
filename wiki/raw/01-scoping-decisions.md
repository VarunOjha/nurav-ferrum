# RAW SOURCE — Scoping Q&A and owner directives (session 1, 2026-10-08)

> Immutable raw source. Records the owner's answers verbatim-in-substance. Later changes must be
> recorded as new raw sources / ADRs, not by editing this file.

## Environment observed (2026-10-08, session 1)

| Item | Observed |
|---|---|
| OS | Windows 11 Pro 10.0.26200 x64 |
| Repo | Empty folder `ferrum-rust-webclient`; `git init -b main` performed in session 1 |
| Rust (rustc/cargo/rustup) | NOT installed |
| Node.js / npm | NOT installed (owner installing Node LTS via winget during session 1) |
| MSVC Build Tools | NOT installed (`link.exe` on PATH is Git's, not MSVC's) |
| WebView2 Runtime | 154.0.4258.62 (EdgeUpdate registry `pv`) |
| Microsoft Edge | 154.0.4258.x |
| Google Chrome | 154.0.8037.x |
| Python | 3.12.10 |
| Git | 2.52.0.windows.1 |
| CPU vendor | AMD (owner-stated, desktop) |

## Scoping answers

| # | Question | Owner answer |
|---|---|---|
| Q1 | Primary goal | **Both, equally** — usable app AND rigorous research framework, developed in lock-step |
| Q2 | Toolchain install | **Owner installs via winget** (Claude supplies exact commands) |
| Q3 | Shell UI stack | **Vanilla TypeScript + Vite** |
| Q4 | WebView hosting model | **Child WebViews in one window** — trusted shell WebView + one untrusted child WebView per tab (Tauri 2 multi-webview, `unstable` feature; documented risk) |
| Q5 | Network call logging depth | **Metadata only** (URL, method, status, resource type, timing, sizes, tab, policy decision) as JSONL; no headers/bodies |
| Q6 | Benchmark hardware | **This desktop, AMD CPU** (energy via AMD RAPL-equivalent counters through LibreHardwareMonitor where supported; else mark unsupported) |
| Q7 | Default site isolation | **WebView2 profiles in a shared browser process** (per-site profiles; risk: Tauri/wry may not expose profile at creation) |
| Q8 | Repo / CI / License | **git + GitHub Actions (windows-latest), dual MIT OR Apache-2.0**; Claude never pushes; owner creates remote |
| Q9 | Benchmark harness language | **Rust orchestrator** (trial scheduling, randomization, Windows-API process sampling) invoking Playwright scripts |
| Q10 | Playwright script language | **Node/TypeScript** (analysis/statistics remain Python) |
| Q11 | Review checkpoints | **Stop after each milestone** for owner review/approval |
| Q12 | Default navigation posture | **Open browsing + blocklist** (any HTTPS; HTTP upgraded/warned; non-web schemes require confirmation) |
| Q13 | Node for the plan app | **Owner installs Node LTS now** |
| Q14 | Approvals mechanism in plan app | **Approve in UI, persisted to repo** (`plan/approvals.json`, git-tracked, via local Next.js API route) |

## Owner directives (verbatim-in-substance, session 1)

1. "Ignore 'Start implementation now…' — let's ask and plan well before we proceed."
2. "Create folder called `interactive_plan`. In this folder set up a Next.js application. Put architecture, plan, project plan + milestones and visualize this whole thing."
3. "Use ultracode here." (multi-agent orchestration authorized)
4. "First the interactive plan comes together. I then approve everything else."
5. "We go phase wise. We do phase-wise testing and rigorous testing."
6. "It is assumed that this project will take multiple sessions + multiple days and will run out of tokens and will resume when interrupted — put all of that in the md files."
7. "Use Karpathy's llm-wiki for updated documentation decision making."
8. "Ask me questions whenever."
9. "First create this larger plan + structure and then I will approve implementation."

## Claude defaults proposed in session 1 (not yet owner-approved; approvable in the plan app)

- ACM `acmart` LaTeX template for the manuscript (venue TBD).
- Repo root is the project root (no nested `ferrum/` folder); Cargo workspace mirrors §12 layout.
- Exact toolchain install commands:
  ```powershell
  winget install -e --id Rustlang.Rustup
  winget install -e --id Microsoft.VisualStudio.2022.BuildTools --override "--quiet --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
  winget install -e --id OpenJS.NodeJS.LTS
  rustup default stable-msvc
  ```
- Initial risk list: (1) WebView2 profile selection must happen at controller creation — may be unreachable via Tauri/wry; (2) Tauri multi-webview is behind `unstable`; (3) TrySuspend / MemoryUsageTargetLevel need raw COM via `with_webview` (unsafe); (4) AMD energy counters need admin + kernel driver, CPU-package only; (5) fair process-tree attribution between Chrome/Edge vs Ferrum+WebView2; (6) Playwright-over-CDP to WebView2 has partial feature support.
