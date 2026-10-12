# Ferrum

**Status: tabs and sessions (phase P3, milestone M2), awaiting the owner's exit review.** Ferrum has tabs (one
WebView2 view each), keyboard shortcuts that also work inside a page, a separate profile per site, restore after a
restart or a crash, local history, basic downloads, a settings screen and a sidebar. There is no release and no
benchmark result.

Ferrum aims to be an open-source, resource-efficient and security-conscious web-application container
for Windows 11, built with Rust, Tauri 2 and Microsoft WebView2. Whether it actually uses fewer resources
than Chrome or Edge is a research question, not an established property (see
[RESEARCH_PLAN.md](RESEARCH_PLAN.md)). It is also a research project: a
reproducible benchmark framework comparing Ferrum with Google Chrome, Microsoft Edge and a minimal
Tauri baseline, and an experimental adaptive WebView lifecycle manager, written up as a paper.

The working paper title is *Adaptive Resource Management for Chromium-Based Desktop Web Containers:
Design and Experimental Evaluation*. Whether any of Ferrum's ideas are novel is **not established**; a
literature review is planned before any such claim.

## How this project works

- **Planning first.** Every phase, decision, risk and experiment is a page in [`wiki/`](wiki/). The
  owner approves each page in the interactive plan app before any implementation that depends on it.
- **Phase-gated.** Work proceeds in phases P0–P8 (milestones M1–M7), each with an automated and a
  manual test gate and an owner review at its exit.
- **Built across many sessions.** The documentation is the project memory, following
  [Karpathy's LLM-wiki pattern](wiki/raw/research/llm-wiki-pattern.md). Any new session resumes from
  [`STATUS.md`](STATUS.md), [`wiki/log.md`](wiki/log.md) and the latest handoff.
- **AI-assisted, human-responsible.** See [`AI_USAGE.md`](AI_USAGE.md).

## Repository map

| Path | What it is |
|---|---|
| [`STATUS.md`](STATUS.md) | Live state: current phase, in-flight work, blockers, next action |
| [`CLAUDE.md`](CLAUDE.md) | Session bootstrap for Claude Code (resume, checkpoint, integrity rules) |
| [`PLAN.md`](PLAN.md) | Human summary of the phases and milestones |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Human summary of the planned architecture |
| [`RESEARCH_PLAN.md`](RESEARCH_PLAN.md) | Human summary of research questions, hypotheses and experiments |
| [`AI_USAGE.md`](AI_USAGE.md) | How AI assistance is used and reviewed |
| [`wiki/SCHEMA.md`](wiki/SCHEMA.md) | Rules of the wiki (page types, ids, approvals, operations) |
| [`wiki/index.md`](wiki/index.md) | Catalogue of every wiki page |
| [`wiki/log.md`](wiki/log.md) | Append-only project log |
| [`wiki/raw/`](wiki/raw/) | Immutable sources: requirements, owner decisions, research notes, later benchmark data and test evidence |
| [`wiki/overview/`](wiki/overview/) | Project overview, glossary, open questions for the owner |
| [`wiki/architecture/`](wiki/architecture/) | Architecture narrative and one page per component |
| [`wiki/phases/`](wiki/phases/) | One page per phase: tasks, test gates, exit criteria |
| [`wiki/decisions/`](wiki/decisions/) | Architecture decision records (ADRs) |
| [`wiki/risks/`](wiki/risks/) | Risk register |
| [`wiki/research/`](wiki/research/) | Research questions, hypotheses, experiments, metrics, workloads |
| [`wiki/quality/`](wiki/quality/) | Test strategy and gates |
| [`wiki/operations/`](wiki/operations/) | Session, resume, handoff, approval, git and environment procedures |
| `wiki/interactive-plan/` | Data contract and views of the plan app |
| `interactive_plan/` | Next.js app that visualises the wiki and records approvals (planning tool, not shipped) |
| `plan/approvals.json` | Owner approvals, written only by the plan app |

| [`apps/desktop/`](apps/desktop/) | The Ferrum app: shell UI (`index.html`, `src/`) and Tauri host (`src-tauri/`) |
| [`crates/`](crates/) | Rust libraries: `core` (settings, address rules), `webview-manager` (the only raw WebView2 code), stubs for later phases |
| [`tests/fixtures/server/`](tests/fixtures/server/) | Local HTTPS test site used by the automated checks |
| [`apps/desktop/tests/smoke/`](apps/desktop/tests/smoke/) | Smoke tests (Playwright over the debugging channel, adr-0031) |
| [`scripts/verify/`](scripts/verify/) | One PowerShell check per task (PASS, FAIL or NOT READY) |
| [`docs/`](docs/) | User and developer documentation |

The layout follows section 12 of the [master prompt](wiki/raw/00-master-prompt.md) (adr-0018); `benchmarks/` and
`analysis/` arrive in later phases.

## Getting started

Windows 11 with the WebView2 runtime. Toolchain prerequisites (Rust 1.99.0 via `rust-toolchain.toml`, the MSVC
build tools, Node.js) and exact install commands are in
[`wiki/operations/ops-environment-setup.md`](wiki/operations/ops-environment-setup.md). The repository path may
contain spaces; quote it.

Build and run (PowerShell 7, from the repository folder):

```powershell
cd apps/desktop
npm ci
npm run tauri -- build --no-bundle      # release build: target\release\ferrum-desktop.exe
cd ../..
& ".\target\release\ferrum-desktop.exe"
```

For a debug build, build the shell first (the app embeds it when compiled): `npm run build` in `apps/desktop`, then
`cargo run -p ferrum-desktop` from the repository folder. Debug builds allow the developer tools; release builds do
not.

Settings live in `config.toml` in the app's config folder (`%APPDATA%\dev.ferrum.desktop`; the settings screen,
Ctrl+Comma, edits it; `--user-config <path>` uses another file and `--config <path>` overrides it for experiments);
the session (`session.json`), history (`history.json`) and logs (`logs\ferrum.jsonl`) are in the data folder
(`%LOCALAPPDATA%\dev.ferrum.desktop`, or `[storage] data_dir`). Details: [comp-core](wiki/architecture/components/comp-core.md) and
[comp-app-shell](wiki/architecture/components/comp-app-shell.md).

Tests:

```powershell
cargo test --workspace                       # unit and integration tests
cargo run -p fixture-server -- ca init       # once: a local test certificate authority (localhost only);
                                             # it prints the certutil command that installs it for your user
cd apps/desktop/tests/smoke; npm ci; npm run smoke   # all app tests (build the shell, the app and the test server first)
npm run p3                                   # only the P3 integration suite; npm run p2: only the P2 tests
pwsh -NoProfile -File scripts/verify/p2.15-quick-whole-app.ps1   # or any task check in scripts/verify/
```

The manual checks for the end of P3 are in [docs/testing/manual-checklist-p3.md](docs/testing/manual-checklist-p3.md)
(P2's: [manual-checklist-p2.md](docs/testing/manual-checklist-p2.md)). Some app tests press real keys and bring Ferrum
to the front for a few seconds; do not type while they run.

## Using Ferrum (P3)

| Do this | Keys or place |
|---|---|
| New tab, close tab, reopen the last closed tab | Ctrl+T, Ctrl+W (or Ctrl+F4), Ctrl+Shift+T; the + and × in the tab strip; middle-click a tab to close it |
| Next or previous tab; tab 1 to 8; last tab | Ctrl+Tab or Ctrl+Page Down; Ctrl+Shift+Tab or Ctrl+Page Up; Ctrl+1 to Ctrl+8; Ctrl+9 |
| Address bar | Ctrl+L, Alt+D or F6 |
| Back, forward, reload | Alt+Left, Alt+Right, F5 or Ctrl+R |
| Sidebar (open tabs and history) | Ctrl+Shift+S, or the ☰ button |
| Settings (start-up sites, per-site profiles, download folder) | Ctrl+Comma, or the ⚙ button |
| Reorder tabs | drag a tab in the strip |

Each site (its main domain, for example `example.com`) keeps its own cookies and storage. When a link in a tab leads to
another site, Ferrum asks first, then moves the tab to that site's profile (its back history is lost). Tabs come back
after a restart or a crash. Downloads go to your Downloads folder (or the folder in the settings) and never replace a
file.

Known limitations of P3: back/forward history of a tab is not restored after a restart (WebView2 cannot set it); a
page reached by a redirect to another site stays in the first site's profile; pop-ups open in a new tab without a link
back to the opening page, so some non-Google sign-in pop-ups may not work (P4); pages are drawn above Ferrum's own
window, so Ferrum's panels never overlap a page (they sit beside it or hide it); no blocklist or permission prompts
yet (P4).

## License

Ferrum is dual-licensed under either of

- the MIT licence ([LICENSE-MIT](LICENSE-MIT)), or
- the Apache License, Version 2.0 ([LICENSE-APACHE](LICENSE-APACHE)),

at your option (`MIT OR Apache-2.0`, owner decision recorded in
[adr-0011](wiki/decisions/adr-0011-git-ci-license.md)). Unless you state otherwise, any contribution you
intentionally submit for inclusion in Ferrum is dual-licensed as above, without any additional terms or conditions.
