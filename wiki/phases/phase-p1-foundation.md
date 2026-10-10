---
id: phase-p1-foundation
type: phase
title: "P1 Foundation: toolchain, repo scaffold, CI, de-risking spikes"
status: planned
updated: 2026-10-10
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/research/tauri-webview2-capabilities.md
  - raw/research/measurement-methodology.md
  - raw/research/nextjs-stack.md
  - raw/research/related-work-seed.md
  - raw/research/llm-wiki-pattern.md
  - raw/owner/2026-10-10-s01-q008-and-pause.md
related: [phase-p0-planning, phase-p2-minimal-container, schema, risk-r01, risk-r02, risk-r03, risk-r04, risk-r05, risk-r06, risk-r15, risk-r18, risk-r20, adr-0019, comp-windows-os, comp-benchmark-harness, ov-research-plan, ops-environment-setup, qual-ci-plan, ov-arch-repo-layout, adr-0005, adr-0021, adr-0007, adr-0010, adr-0011, adr-0012, adr-0018, comp-core, comp-webview2-runtime]
approvable: true
phase: phase-p1-foundation
tags: [toolchain, scaffold, ci, spikes, de-risking, literature-review]
milestone: null
order: 1
depends_on: [phase-p0-planning]
est_sessions: 6
entry_criteria:
  - "phase-p0-planning has status done and key phase-p0-planning#exit is APPROVED in plan/approvals.json, and the owner has explicitly said in chat to start P1, transcribed to raw/owner/ (owner directive 2026-10-10: pause after the planning phase; SCHEMA section 9.7 exit-gate step 7)."
  - "Owner approval recorded and not stale in plan/approvals.json (effective state APPROVED or APPROVED_VOLATILE_DRIFT) for the P1 dependency set: schema, phase-p1-foundation, every ADR in decisions, every component in components."
  - "No open Q-NNN in ov-open-questions blocks any id in the dependency set."
  - "Owner is available to confirm the UAC prompts of the toolchain installs Claude runs (adr-0021, superseding adr-0005); no kernel driver is installed in P1 (drivers need separate owner approval)."
deliverables:
  - "Installed and recorded toolchain: rustup/rustc/cargo (stable-msvc, Rust >= 1.90), MSVC Build Tools, Node LTS, Python, Git, PowerShell 7 (raw/evidence/phase-p1-foundation/toolchain.txt)."
  - "Benchmark machine inventory (CPU model and Zen generation, RAM, GPU, display, power plan, browser and WebView2 versions)."
  - "Git hygiene: .gitignore, .gitattributes, LICENSE-MIT, LICENSE-APACHE, first local commits."
  - "Cargo workspace mirroring master prompt section 12 (adr-0018) with empty, compiling, linted library crates."
  - "Four de-risking spike reports (S1 multi-webview, S2 profile at creation, S3 raw COM via with_webview, S4 Playwright over CDP) with pass/fail tables."
  - "Owner-approved M1 design decisions derived from the spikes (new ADRs, risk pages updated)."
  - "Automated wiki lint (all SCHEMA section 9.3 codes that are mechanical) and wiki/raw/MANIFEST.sha256."
  - "GitHub Actions CI workflow (windows-latest) plus a local script that runs the same steps."
  - "Dependency auditing (cargo-deny) configured."
  - "Doc stubs: SECURITY.md, BENCHMARKING.md, REPRODUCIBILITY.md, docs/README.md; AI_USAGE.md updated."
  - "Literature review protocol and first batch of verified reading notes (research track start)."
tasks:
  - id: p1.1
    title: "Claude confirms and records the toolchain already installed on 2026-10-09 (Rust stable-msvc, VS 2022 Build Tools, Node 24, PowerShell 7; see Scope), runs the winget commands in the body only for anything missing (owner clicks through UAC prompts, adr-0021), and installs cargo-deny with 'cargo install cargo-deny --locked'"
    verify: "rustc -Vv shows host x86_64-pc-windows-msvc and release >= 1.90; cargo -V, rustup show, node --version, npm --version, python --version, git --version, pwsh --version and 'cargo deny --version' outputs saved to raw/evidence/phase-p1-foundation/toolchain.txt; 'cargo new --lib' in a temp dir followed by 'cargo build' links successfully (proves MSVC linker)."
  - id: p1.2
    title: "Record the benchmark machine inventory and current browser/WebView2 versions; owner answers CPU/RAM and meter questions"
    verify: "raw/evidence/phase-p1-foundation/environment.md contains outputs of the PowerShell inventory commands in the body (CPU name, cores, RAM, GPU, power scheme, OS build, WebView2 pv re-read and compared with raw/evidence/phase-p0-planning/env-webview2-pv.txt, Edge and Chrome versions)."
  - id: p1.3
    title: "Git hygiene: .gitignore (target/, spikes/*/target/, node_modules/, .next/, benchmarks/results/, profiles, *.etl; plan/snapshots/ stays tracked), .gitattributes, LICENSE-MIT and LICENSE-APACHE from their official texts, README license section"
    verify: "'git check-ignore -v target/x spikes/s1-multiwebview/target/x node_modules/x interactive_plan/.next/x benchmarks/results/x' prints a rule for each and 'git check-ignore plan/snapshots/x' prints nothing; both licence files exist; local commits are already authorised (Q-104, 2026-10-08) and 'git log --oneline' shows the commit."
  - id: p1.4
    title: "Cargo workspace scaffold per adr-0018: root Cargo.toml (resolver 2, exclude = [\"spikes/*\"]), crates/core, crates/webview-manager, crates/security, crates/resource-manager, crates/telemetry, crates/network-logger (if Q-106 approves it) as library stubs; rust-toolchain.toml pinned to the observed stable version; section 12 directories with README placeholders"
    verify: "cargo build --workspace --locked, cargo test --workspace --locked, cargo fmt --all -- --check and cargo clippy --workspace --all-targets --locked -- -D warnings all exit 0; outputs saved as evidence."
  - id: p1.17
    title: "Tauri CLI and frontend pins: use the npm package @tauri-apps/cli at the Tauri version pinned for the spikes (2.12.1 at research time, matching the adr-0006 Vite toolchain); record exact vite and typescript pins for the shell; spikes are created by hand (Cargo.toml plus the src-tauri layout documented in each spike README), not with create-tauri-app@latest"
    verify: "package.json for spikes/s1-multiwebview has exact (no ^ or ~) versions for @tauri-apps/cli, vite and typescript; 'npx tauri --version' output saved to raw/evidence/phase-p1-foundation/toolchain.txt; versions re-checked on the registry at task start (UNVERIFIED[phase-p1-foundation] until then)."
  - id: p1.5
    title: "Spike S1 (risk-r02, risk-r05): multi-webview stability. Tauri 2.12.1 with the unstable feature, vanilla TS + Vite shell (adr-0006), three child webviews created from an async command, tab switching via hide/show, auto-resize; plus the process-attribution check (launch suspended in a Job Object)"
    verify: "raw/evidence/phase-p1-foundation/spike-s1-multiwebview.md contains a pass/fail row for each check listed in the body (sync-vs-async creation deadlock, resize, Alt+Tab keyboard focus, z-order overlap, blank rendering, text-editing shortcuts, Job Object membership of msedgewebview2 processes compared with GetProcessInfos and GetProcessExtendedInfos) with the command or manual step used; the spike builds with 'cargo build --locked' in spikes/s1-multiwebview."
  - id: p1.6
    title: "Spike S2 (risk-r01): WebView2 profile chosen at controller creation. Evaluate routes (a) released Tauri with PR 16054, (b) patched tauri-runtime-wry, (c) own controllers via raw COM in child HWNDs, (d) per-site data directory"
    verify: "spike-s2-profiles.md has a route x criterion table: creation succeeds; two profiles report the same BrowserProcessId; a cookie set by a fixture page in profile A is absent in profile B; maintenance and unsafe cost noted. At least route (d) and one of (a)/(b)/(c) are actually executed."
  - id: p1.7
    title: "Spike S3 (risk-r03): raw COM through with_webview. Obtain controller, cast ICoreWebView2_3 (hide, TrySuspend, IsSuspended, show/Resume), ICoreWebView2_19 (MemoryUsageTargetLevel Low/Normal, never mixed with suspend), ProcessFailed and WebResourceResponseReceived handlers, GetProcessInfos"
    verify: "'cargo tree -i webview2-com' and 'cargo tree -i windows' each show one version matching Tauri's (0.39 / 0.62 at research time); spike-s3-raw-com.md logs each call's HRESULT/outcome and drafts the unsafe invariants for each COM call."
  - id: p1.8
    title: "Spike S4 (risk-r06): Node/TS Playwright 1.64 connectOverCDP to the S1 spike launched non-elevated with WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222; same script against Chrome for Testing and Edge with a fresh user-data-dir and the same flag"
    verify: "Script exits 0 and writes targets.json listing every CDP target (shell and each child identifiable); it navigates one child to a local fixture and reads paint timing entries; the report lists which Playwright features failed over CDP."
  - id: p1.9
    title: "Spike synthesis and M1 design freeze: update risk pages, component pages and architecture; propose new ADRs (next free numbers) for the profile route, back/forward mechanism and CDP benchmark path; owner decides"
    verify: "New ADR pages exist with status proposed; each spiked risk page has an updated status and cites its spike report; the owner approved the new ADRs in Claude Code, recorded by Claude (adr-0023; effective state APPROVED)."
  - id: p1.10
    title: "Re-confirm the git-backed lint rules (RAW-IMMUTABLE from git history plus wiki/raw/MANIFEST.sha256, STALE-UPDATED) on the P1 history. They were already built in P0 (p0.13, IP-5, commit 19b5a95) inside npm run lint:wiki; P1 adds no second linter and only re-runs and, if needed, adjusts them"
    verify: "Fixture repos trigger RAW-IMMUTABLE and STALE-UPDATED in unit tests; 'npm run lint:wiki' on the real wiki exits 0 with zero errors; the MANIFEST created in p0.8 matches every raw file, and new raw files since p0.8 have appended lines."
  - id: p1.11
    title: "CI: .github/workflows/ci.yml on windows-latest (Rust fmt/clippy/test/deny, plan app lint/typecheck/unit/build, wiki lint) and scripts/ci-local.ps1 running identical steps"
    verify: "scripts/ci-local.ps1 exits 0 locally (output saved); owner pushes to the GitHub remote and reports the Actions run result (Claude never pushes)."
  - id: p1.12
    title: "Dependency auditing: deny.toml with a licence allowlist compatible with MIT OR Apache-2.0, advisories check; Cargo.lock and package-lock.json committed"
    verify: "cargo deny check exits 0 (output saved); npm audit report for interactive_plan saved with any findings dispositioned."
  - id: p1.13
    title: "Doc stubs: SECURITY.md (reporting, threat-model outline, debug-port and OAuth notes), BENCHMARKING.md (fairness rules outline), REPRODUCIBILITY.md (environment capture, version pinning), docs/README.md; update AI_USAGE.md"
    verify: "Files exist; each links to its canonical wiki pages; wiki lint reports no dangling relative links."
  - id: p1.14
    title: "Research track start: literature review protocol (questions, databases, search strings, inclusion/exclusion, verification rule) and first reading batch covering the seed list's gaps"
    verify: "Protocol page wiki/research/ov-research-literature-protocol.md and log page wiki/research/ov-research-literature-log.md exist (created by this task, added to index.md); at least one new raw research note with access dates and VERIFIED/UNCERTAIN labels; no citation without a fetched source or Crossref record."
  - id: p1.15
    title: "Enforcement of the CODE rule (SCHEMA section 9.8): pre-commit hook that runs the quick lint subset and warns when crates/ or apps/ change without a component page change"
    verify: "In a temporary clone, a commit touching crates/core without a component page change prints the warning; a commit with both passes; result recorded and the UNVERIFIED tag in SCHEMA section 9.8 resolved."
  - id: p1.16
    title: "Exit gate: run every automated item on one commit, save evidence, lint clean, set gate-review, owner review (adr-0014)"
    verify: "All test_gate.evidence files exist; 'gate' log entry; owner approves phase-p1-foundation#exit."
test_gate:
  automated:
    - "cargo fmt --all -- --check"
    - "cargo clippy --workspace --all-targets --locked -- -D warnings"
    - "cargo test --workspace --locked"
    - "cargo deny check"
    - "cd interactive_plan && npm run lint:wiki (zero errors)"
    - "cd interactive_plan && npm run lint && npm run typecheck && npm run test && npm run build"
    - "pwsh -NoProfile -File scripts/ci-local.ps1 (PowerShell 7, adr-0025)"
    - "Spike S4 Playwright script (spikes/s4-playwright-cdp) exits 0"
  manual:
    - "Owner confirmed the UAC prompts of the installs Claude ran (adr-0021) and saw each complete (or reports the error text)."
    - "Owner performs the Alt+Tab keyboard-focus and window-resize checks of spike S1 and records the outcome."
    - "Owner reviews the four spike reports and chooses the profile route (S2) and confirms the hosting model (adr-0007) or asks for an alternative."
    - "Owner creates the GitHub remote, pushes, and reports the CI result, or explicitly defers remote creation."
  evidence:
    - raw/evidence/phase-p1-foundation/toolchain.txt
    - raw/evidence/phase-p1-foundation/environment.md
    - raw/evidence/phase-p1-foundation/cargo-fmt.txt
    - raw/evidence/phase-p1-foundation/cargo-clippy.txt
    - raw/evidence/phase-p1-foundation/cargo-test.txt
    - raw/evidence/phase-p1-foundation/cargo-deny.txt
    - raw/evidence/phase-p1-foundation/wiki-lint.txt
    - raw/evidence/phase-p1-foundation/ci-local.txt
    - raw/evidence/phase-p1-foundation/spike-s1-multiwebview.md
    - raw/evidence/phase-p1-foundation/spike-s2-profiles.md
    - raw/evidence/phase-p1-foundation/spike-s3-raw-com.md
    - raw/evidence/phase-p1-foundation/spike-s4-playwright-cdp.md
exit_criteria:
  - "Toolchain verified and recorded; Rust >= 1.90 on stable-msvc."
  - "Workspace builds, tests, formats, lints and passes cargo-deny on one commit."
  - "All four spikes executed with reports; each of risk-r01, risk-r02, risk-r03, risk-r06 has an updated status citing evidence."
  - "risk-r05 attribution check (Job Object membership vs GetProcessInfos/GetProcessExtendedInfos) recorded in the S1 report."
  - "Owner-approved ADRs fix the M1 hosting model, profile route and back/forward mechanism; P2 page revised accordingly and re-approved."
  - "Wiki lint (TS, from P0) extended with git-backed rules and clean; MANIFEST.sha256 consistent."
  - "Literature review protocol exists; first reading batch recorded."
  - "Owner approved key phase-p1-foundation#exit."
risks: [risk-r01, risk-r02, risk-r03, risk-r04, risk-r05, risk-r06, risk-r15, risk-r18, risk-r20]
decisions: [adr-0021, adr-0006, adr-0007, adr-0010, adr-0011, adr-0012, adr-0014, adr-0018, adr-0019]
experiments: []
components: [comp-core, comp-webview2-runtime, comp-windows-os]
unverified:
  - claim: "The VS 2022 Build Tools winget command with the VCTools workload and --includeRecommended installs everything Rust stable-msvc and Tauri need (linker and Windows SDK)"
    verify_in: phase-p1-foundation
  - claim: "Rust stable-msvc locates the MSVC link.exe even though Git's link.exe is on PATH"
    verify_in: phase-p1-foundation
  - claim: "winget install accepts --version 24.20.0 for OpenJS.NodeJS.LTS to pin the Node major"
    verify_in: phase-p1-foundation
  - claim: "A renderer crash can be triggered deliberately in WebView2 for the ProcessFailed check"
    verify_in: phase-p1-foundation
  - claim: "A git pre-commit hook can enforce or warn on the SCHEMA section 9.8 CODE rule"
    verify_in: phase-p1-foundation
---

# P1 Foundation: toolchain, repo scaffold, CI, de-risking spikes

P1 turns an empty repository into a working Rust workspace and, before any M1 design is frozen, runs four throwaway spikes against the riskiest assumptions in the plan. The spikes come first because three owner decisions (Q4 child WebViews, Q7 per-site profiles, Q9/Q10 Playwright harness) rest on capabilities that research found only partly reachable through Tauri ([raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md) sections 2, 5, 6, 7, 9, 10).

## Scope

### Toolchain (p1.1, adr-0021)

Claude runs these commands in PowerShell (exact text from [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md), "Claude defaults proposed"); the owner clicks through the UAC prompts. This follows [ADR-0021](../decisions/adr-0021-claude-runs-toolchain-installs.md), which supersedes adr-0005 (owner answer to Q-218, [raw/owner/2026-10-08-s01-wave0b.md](../raw/owner/2026-10-08-s01-wave0b.md)). Kernel drivers are not covered and need a separate owner approval.

```powershell
winget install -e --id Rustlang.Rustup
winget install -e --id Microsoft.VisualStudio.2022.BuildTools --override "--quiet --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
winget install -e --id OpenJS.NodeJS.LTS
rustup default stable-msvc
```

Observed on 2026-10-09 (session s01, not yet saved as evidence): Rust 1.99.0 on `stable-x86_64-pc-windows-msvc` (default), Visual Studio Build Tools 2022 17.14 with MSVC 14.44 and Windows SDK 10.0.26100, Node v24.20.0 (installed in P0, p0.9) and PowerShell 7.6.6 are already installed; cargo-deny is not. p1.1 therefore confirms and records these versions and runs a command above only for a missing tool. Whether the Build Tools command is sufficient for Tauri is UNVERIFIED[phase-p1-foundation]. Tauri 2.12.1 needs Rust 1.90 or newer (research note section 10, item 10). After 2026-10-28 the LTS winget id may resolve to Node 26 ([raw/research/nextjs-stack.md](../raw/research/nextjs-stack.md) section 2); pinning with `--version` is UNVERIFIED[phase-p1-foundation].

Verification commands Claude runs afterwards (output to `toolchain.txt`):

```powershell
rustup show
rustc -Vv
cargo -V
node --version
npm --version
python --version
git --version
pwsh --version
where.exe link.exe
```

`raw/01` observed that `link.exe` on PATH is Git's, not MSVC's. Whether that matters for cargo is UNVERIFIED[phase-p1-foundation]; the decisive check is a throwaway `cargo new --lib` + `cargo build`.

### Machine inventory (p1.2)

Needed for the measurement questions in [raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md) section 10 (CPU generation, RAM, wall-power meter, PawnIO consent) and for risk-r04.

```powershell
Get-CimInstance Win32_Processor | Select-Object Name, NumberOfCores, NumberOfLogicalProcessors
Get-CimInstance Win32_ComputerSystem | Select-Object TotalPhysicalMemory
Get-CimInstance Win32_VideoController | Select-Object Name, DriverVersion, CurrentHorizontalResolution, CurrentVerticalResolution
Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, BuildNumber
powercfg /getactivescheme
reg query "HKLM\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" /v pv
```

The `reg query` line above was run on 2026-10-08 (session s01) and returned `pv REG_SZ 154.0.4258.62` ([raw/evidence/phase-p0-planning/env-webview2-pv.txt](../raw/evidence/phase-p0-planning/env-webview2-pv.txt)), matching [raw/01](../raw/01-scoping-decisions.md). p1.2 re-reads it, because the Evergreen runtime updates itself. Browser versions are taken from the executables' file versions.

### Repository scaffold (p1.3, p1.4, adr-0011, adr-0018)

- Repo root is the project root; the Cargo workspace mirrors master prompt section 12 (adr-0018, proposed until approved).
- Licence: dual MIT OR Apache-2.0 (Q8). Licence texts are copied from the official sources and the URLs recorded in the commit message.
- Library crates start with `#![forbid(unsafe_code)]`. The crate that will host raw COM (decided in p1.9) relaxes this only with a documented `## Unsafe invariants` section on its component page (master prompt section 15; SCHEMA section 6.2).
- Spike code lives in `spikes/` outside the workspace members (`exclude = ["spikes/*"]`; each spike has its own Cargo.toml and lockfile; `spikes/*/target/` is git-ignored). It is kept for reproducibility of the evidence but never shipped. Whether to keep `spikes/` long-term is part of Q-106 ([ov-arch-repo-layout](../architecture/ov-arch-repo-layout.md)).
- Cargo commands in tasks, the test gate and CI use `--locked` ([qual-ci-plan](../quality/qual-ci-plan.md)).

### De-risking spikes (p1.5 to p1.8) before the M1 design

Version pins come from the research note (tauri 2.12.1, wry 0.57.0, webview2-com 0.39.1, windows 0.62.2, Playwright 1.64.0). At spike start Claude re-checks crates.io and npm. If versions moved, the spike uses the newer patch release and records the change.

| Spike | Risk | Question | Pass criteria |
|---|---|---|---|
| S1 multi-webview | risk-r02 (and risk-r05) | Is `Window::add_child` (unstable feature) usable for a shell + N tabs on Windows? | No deadlock when created from an async command (and the sync-command deadlock reproduced or documented); tabs switch by hide/show; window resize keeps children laid out; keyboard focus reaches tab content after Alt+Tab (issue 13466); shell UI does not need to overlap tab bounds (issue 15682); children render (issues 10011, 11376); text-editing shortcuts work (issue 9257). Attribution row (risk-r05, comp-benchmark-harness): launch the spike suspended in a Job Object; compare job membership with `GetProcessInfos` and `GetProcessExtendedInfos`; record whether `msedgewebview2` processes join the job (UNVERIFIED[phase-p1-foundation]) |
| S2 profiles | risk-r01 | Can each tab get its own WebView2 profile in one shared browser process (Q7, adr-0010)? | For each route (a) to (d): creation succeeds; two profiles share one `BrowserProcessId`; cookie isolation between profiles holds on a local fixture; unsafe and maintenance cost noted |
| S3 raw COM | risk-r03 | Can Ferrum reach TrySuspend/Resume, MemoryUsageTargetLevel, ProcessFailed, WebResourceResponseReceived and GetProcessInfos through `with_webview`? | Each call returns success or a documented failure HRESULT; TrySuspend only attempted while hidden; one `webview2-com`/`windows` version in the tree; unsafe invariants drafted |
| S4 Playwright CDP | risk-r06 | Can the Node/TS Playwright harness drive a multi-webview Ferrum and Chrome/Edge through the same CDP path? | `connectOverCDP` attaches; every target listed and attributable to shell or tab; navigation and paint timing work; unsupported features listed |

S4 must run the app non-elevated: environment-variable browser flags are ignored for elevated apps (research note section 7). The debug port exposes the trusted shell WebView to local processes, so it is benchmark/debug only (goes into SECURITY.md).

### Spike synthesis and design freeze (p1.9)

The spikes feed the M1 design. Expected outputs:

- A new ADR choosing the profile route. If route (d) per-site data directories is chosen, it contradicts Q7's "shared browser process", so adr-0010 would be superseded through DECIDE with owner approval.
- A new ADR for back/forward: `eval("history.back()")` versus raw COM `GoBack`/`GoForward` (Tauri 2.12.1 has neither as an API, research note section 2).
- A new ADR or adr-0012 revision on whether the CDP path is used for Ferrum benchmarks.
- If S1 fails badly, a DECIDE on the hosting model (adr-0007) before P2, for example one top-level window per tab. The owner chooses.

[P2](phase-p2-minimal-container.md) and [P3](phase-p3-tabs-sessions.md) pages are revised after p1.9. Revising them stales their approvals; that is intended, and the owner re-approves before P2 starts.

### Quality infrastructure (p1.10 to p1.13, p1.15)

- The wiki lint already exists from P0 (`npm run lint:wiki`, IP-5, normative per SCHEMA §9.3), and so do its git-backed rules (built early in p0.13, found by the 2026-10-09 review). p1.10 therefore only re-confirms them on the P1 history; it is a check, not new work. The Python quick lint stays a bootstrap fallback (`tools/quick_lint.py`, Q-216).
- Tauri CLI (p1.17): the npm package `@tauri-apps/cli` is used rather than `cargo install tauri-cli`, so the shell's Vite toolchain and the CLI share one `package.json` with exact pins. Spikes are hand-written, not generated by `create-tauri-app@latest`, so that no unpinned template enters the evidence.
- CI runs on `windows-latest` (Q8). Claude can only run the local equivalent; the owner pushes.
- `cargo-deny` checks licences and advisories (master prompt section 15, dependency auditing).

### Research track start (p1.14)

The literature review starts now, not at the end. P1 writes the protocol and covers the gaps the seed list itself names ([raw/research/related-work-seed.md](../raw/research/related-work-seed.md)): the original ARC paper, the Page Lifecycle specification, Windows memory-pressure signalling and whether WebView2 raises page freeze/resume events. Each later phase has one small literature task. The review closes in [P7](phase-p7-lifecycle.md) (p7.12) before any novelty framing in [P8](phase-p8-research-paper.md).

## Out of scope

- Any user-facing Ferrum feature (P2 onward). Spike code is not promoted into `apps/desktop` without being rewritten under P2's tests.
- Benchmark measurements. Spikes may print process IDs and HRESULTs, never performance numbers presented as results.
- Pushing to GitHub. Claude never pushes (adr-0011).

## Step order

```mermaid
flowchart LR
  p1_1["p1.1 toolchain"] --> p1_2["p1.2 inventory"]
  p1_1 --> p1_3["p1.3 git + licences"]
  p1_3 --> p1_4["p1.4 workspace"]
  p1_4 --> p1_17["p1.17 Tauri CLI + pins"]
  p1_17 --> p1_5["p1.5 S1 multi-webview"]
  p1_5 --> p1_6["p1.6 S2 profiles"]
  p1_5 --> p1_7["p1.7 S3 raw COM"]
  p1_5 --> p1_8["p1.8 S4 Playwright CDP"]
  p1_6 --> p1_9["p1.9 synthesis + design freeze"]
  p1_7 --> p1_9
  p1_8 --> p1_9
  p1_4 --> p1_10["p1.10 wiki lint"]
  p1_10 --> p1_11["p1.11 CI"]
  p1_4 --> p1_12["p1.12 cargo-deny"]
  p1_12 --> p1_11
  p1_3 --> p1_13["p1.13 doc stubs"]
  p1_10 --> p1_15["p1.15 pre-commit hook"]
  p1_1 --> p1_14["p1.14 literature protocol"]
  p1_9 --> p1_16["p1.16 exit gate"]
  p1_11 --> p1_16
  p1_13 --> p1_16
  p1_14 --> p1_16
  p1_15 --> p1_16
```

## Checkpoints and interruption recovery

- Each task is one commit. Each spike writes its report incrementally: the table rows are filled as each check runs, so an interrupted spike resumes at the first empty row.
- Spikes are time-boxed at one session each. If a spike overruns, Claude writes the partial report, logs it, and asks the owner whether to continue, change route or accept the risk.
- The elevated installs of p1.1 wait for the owner's UAC confirmation and may need a reboot. Claude records the pending state in `STATUS.md` (`blocked_on`) and continues with tasks that do not need Rust (p1.13, p1.14).

## Owner review checkpoint (adr-0014)

The P1 exit review is the most consequential decision point before code: the owner sees the spike evidence and confirms or changes the M1 design. Approval keys: the new ADRs from p1.9, revised `phase-p2-minimal-container`, `phase-p1-foundation#exit`.

## Phase-label crosswalk for the research notes

The research notes use master prompt phase names, not this registry. Their "P3 security tests" mean [phase-p4-security](phase-p4-security.md); "P5 CDP targets" is answered by spike S4 here; "P-harness (M5)" and "P-bench" mean [phase-p6-benchmark-harness](phase-p6-benchmark-harness.md). The full table is in the root PLAN.md.
