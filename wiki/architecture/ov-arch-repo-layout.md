---
id: ov-arch-repo-layout
type: overview
title: "Architecture: repository layout (master prompt section 12 adapted to repo root)"
status: review
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/research/nextjs-stack.md
  - raw/research/tauri-webview2-capabilities.md
related: [ov-arch-crate-graph, ov-arch-system-overview, ov-arch-configuration, comp-app-shell, comp-webview-manager, comp-security-engine, comp-resource-manager, comp-telemetry, comp-network-logger, comp-core, comp-benchmark-harness, comp-research-analysis, comp-baseline-app, comp-interactive-plan, adr-0011, adr-0012, adr-0013, adr-0016, adr-0018, phase-p1-foundation]
approvable: true
audience: both
phase: phase-p0-planning
tags: [repo, layout, gitignore]
unverified:
  - claim: "A Tauri 2 app can live at apps/desktop with its Rust crate in apps/desktop/src-tauri as a member of a root Cargo workspace"
    verify_in: phase-p1-foundation
  - claim: "Git LFS (or an alternative) is needed for large raw benchmark outputs"
    verify_in: phase-p6-benchmark-harness
  - claim: "Setting turbopack.root to interactive_plan prevents wrong workspace-root inference when other lockfiles exist"
    verify_in: phase-p1-foundation
---

# Repository layout

adr-0018 (proposed): **the repo root is the project root**, with no nested `ferrum/` folder, and the Cargo workspace mirrors [master prompt §12](../raw/00-master-prompt.md). The tree below is the planned end state. Items marked `(+)` are additions to §12. Items marked `(P0)` already exist.

```text
ferrum-rust-webclient/                 # repo root = project root (adr-0018)
├── Cargo.toml                         # [workspace] members, [workspace.dependencies] pins
├── Cargo.lock                         # committed (applications + reproducibility)
├── rust-toolchain.toml            (+) # pins stable >= 1.90 (Tauri note §1); exact version P1
├── deny.toml                      (+) # cargo-deny config (licenses, advisories)
├── .github/workflows/             (+) # CI on windows-latest (adr-0011)
├── apps/
│   ├── desktop/                       # comp-app-shell (Ferrum)
│   │   ├── ui/                    (+) # shell UI: vanilla TS + Vite (adr-0006)
│   │   ├── src-tauri/                 # crate ferrum-desktop (Tauri host)
│   │   │   ├── capabilities/          # shell.json ONLY, no "remote" (trust rule R1)
│   │   │   └── tauri.conf.json
│   │   └── package.json
│   └── baseline-tauri/            (+) # comp-baseline-app (config C), crate ferrum-baseline
├── crates/
│   ├── core/                          # ferrum-core           (comp-core)
│   ├── webview-manager/               # ferrum-webview-manager (comp-webview-manager)
│   ├── security/                      # ferrum-security       (comp-security-engine)
│   ├── resource-manager/              # ferrum-resource-manager (comp-resource-manager)
│   ├── telemetry/                     # ferrum-telemetry      (comp-telemetry)
│   └── network-logger/            (+) # ferrum-network-logger (comp-network-logger)
├── benchmarks/                        # comp-benchmark-harness
│   ├── workloads/                     # local fixture sites (wl-* pages)
│   ├── runners/
│   │   ├── orchestrator/          (+) # crate ferrum-bench (Rust, adr-0012)
│   │   ├── playwright/            (+) # Node/TS Playwright scripts (scoping Q10)
│   │   └── energy-sampler/        (+) # separate elevated sampler (risk-r04), design TBD
│   ├── configurations/                # cfg-* run configs (TOML)
│   └── results/                       # working output, GITIGNORED; curated runs archived to wiki/raw/bench/
├── experiments/
│   ├── baseline/  lifecycle/  isolation/  security/   # per-family experiment configs + notes
├── analysis/                          # comp-research-analysis (Python, adr-0013)
│   ├── scripts/  notebooks/  figures/
│   └── pyproject.toml / requirements lock (P6)
├── research/
│   ├── literature/  methodology/  hypotheses/  paper/   # paper = LaTeX (adr-0017 proposed)
├── docs/                              # user/developer docs
├── tests/                             # cross-crate integration + e2e
│   └── security-fixtures/        (+) # harmless local pages for master prompt §11 tests
├── scripts/                           # Ferrum dev scripts (ci-local.ps1, setup checks)
├── spikes/                        (+) # P1 throwaway spikes S1–S4; NOT workspace members (exclude = ["spikes/*"]);
│                                      #   each has its own Cargo.toml + lockfile; spikes/*/target/ gitignored (Q-106)
├── tools/                         (+) # planning tooling, not Ferrum code: quick_lint.py, approvals_check.py
│                                      #   (Python fallback for the TS wiki lint, SCHEMA §9.3, Q-216)
├── interactive_plan/              (+) # comp-interactive-plan: Next.js app (adr-0016), own package-lock
├── plan/approvals.json            (+) # written only by the plan app (wiki SCHEMA §10)
├── plan/snapshots/                (+) # approved-page snapshots for "diff since approval" (ip-approvals-api); tracked
├── wiki/                     (P0) (+) # LLM-maintained wiki (adr-0002); raw/ immutable
├── CLAUDE.md  STATUS.md       (+)     # session bootstrap + live state (adr-0003)
├── README.md  ARCHITECTURE.md  PLAN.md  RESEARCH_PLAN.md  AI_USAGE.md
├── SECURITY.md  BENCHMARKING.md  REPRODUCIBILITY.md
└── LICENSE-MIT  LICENSE-APACHE        # dual license (adr-0011); §12 "LICENSE" adapted
```

Notes:

- **`docs/` vs `wiki/`.** `wiki/` is the canonical planning, decision and research memory. `docs/` holds end-user and developer documentation generated from it or written for GitHub readers. Where they conflict, the wiki wins (SCHEMA §3.4).
- **`benchmarks/configurations/` vs `experiments/`.** `configurations/` holds *product* configurations (cfg-chrome … cfg-ferrum-adaptive and policy parameter sets). `experiments/<family>/` holds experiment definitions that combine workloads, configurations and trials. The canonical design of each experiment lives in `wiki/research/experiments/`.
- **Generated data is separate from source** (master prompt §12). The harness writes to `benchmarks/results/<run-id>/`, which is gitignored. A run counts for research only once its full raw output is **copied unedited** into `wiki/raw/bench/<run-id>/`. Whether that needs Git LFS depends on size: UNVERIFIED[phase-p6-benchmark-harness].
- **Shell UI location.** Putting the Tauri crate in `apps/desktop/src-tauri/` follows the Tauri convention. Whether it works cleanly as a member of a root Cargo workspace is UNVERIFIED[phase-p1-foundation].

## `.gitignore` plan (phase-p1-foundation deliverable)

| Pattern | Why |
|---|---|
| `target/`, `spikes/*/target/` | Cargo build output (workspace and each spike) |
| `node_modules/`, `**/dist/`, `interactive_plan/.next/` | JS build output |
| `benchmarks/results/` | Working benchmark output (curated copies go to `wiki/raw/bench/`) |
| `**/*.etl`, `**/*.etl.zip` | ETW traces (large; archive selectively) |
| `**/EBWebView/`, `**/*.WebView2/`, `benchmarks/profiles/`, `**/user-data*/` | Browser profiles / UDFs (master prompt §12: never commit profiles) |
| `**/netlog/`, `**/*.netlog.jsonl`, `**/audit.jsonl`, `**/session.json` | Network logs, audit logs and session files hold browsing history |
| `.env`, `.env.*`, `*.pem`, `*.pfx` | Secrets / tokens |
| `analysis/.venv/`, `**/__pycache__/`, `.ipynb_checkpoints/` | Python env |
| `analysis/figures/*` except committed paper figures | Regenerable outputs (paper figures are copied to `research/paper/figures/` with provenance) |
| `interactive_plan/test-results/`, `interactive_plan/playwright-report/` | E2E artefacts (evidence copies go to `wiki/raw/evidence/`) |

**Never gitignored:** `wiki/**`, `plan/approvals.json`, `plan/snapshots/**`, `Cargo.lock`, `package-lock.json` files (including each spike's), `STATUS.md`, `tools/**`.

## Lockfiles and Node project roots

There will be several Node projects: `apps/desktop` (shell UI), `benchmarks/runners/playwright`, and `interactive_plan`. Each keeps its own `package-lock.json`. **No `package.json` sits at the repo root.** That keeps Next.js/Turbopack root detection from picking the wrong folder, and `interactive_plan` additionally sets `turbopack.root` explicitly ([Next.js note §3.5](../raw/research/nextjs-stack.md)). Whether that setting has the intended effect is UNVERIFIED[phase-p1-foundation].
