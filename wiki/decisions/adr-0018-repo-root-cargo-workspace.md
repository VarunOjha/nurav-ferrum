---
id: adr-0018
type: decision
title: "Repository root is the project root; Cargo workspace mirrors master prompt §12 layout"
status: accepted
updated: 2026-10-11
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/research/nextjs-stack.md
  - raw/research/tauri-webview2-capabilities.md
  - raw/owner/2026-10-11-s01-wave2-answers.md
  - raw/owner/2026-10-11-s01-wave2-pages-approval.md
related: [adr-0011, adr-0006, adr-0012, adr-0013, adr-0016, adr-0017, phase-p1-foundation, comp-core, comp-app-shell, comp-webview-manager, comp-security-engine, comp-resource-manager, comp-telemetry, comp-network-logger, comp-benchmark-harness, comp-baseline-app, comp-research-analysis, comp-interactive-plan]
approvable: true
date: 2026-10-08
decided_by: claude-proposed
supersedes: []
options:
  - "Repo root = project root; §12 layout directly at root"
  - "Nested ferrum/ folder exactly as drawn in master prompt §12"
  - "Separate repositories for app, harness and paper"
phase: phase-p0-planning
tags: [repository, layout, cargo, workspace]
unverified:
  - claim: "Tauri CLI 2.12.1 builds an app located at apps/desktop/ (src-tauri inside it) as a member of a root Cargo workspace"
    verify_in: phase-p1-foundation
  - claim: "Separate Node lockfiles (apps/desktop, benchmarks/runners, interactive_plan) do not confuse Next.js/Turbopack root inference when turbopack.root is set explicitly"
    verify_in: phase-p1-foundation
---

# ADR-0018: The repository root is the project root; the Cargo workspace mirrors the master prompt §12 layout

> **Status: approved by the owner on 2026-10-11 (Approval Wave 2).** This is a default Claude suggested in session 1 ([raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md), "Claude defaults proposed"). The owner answered Q-106 ("Yes, approve it", with `spikes/` kept as evidence) in [raw/owner/2026-10-11-s01-wave2-answers.md](../raw/owner/2026-10-11-s01-wave2-answers.md) and approved this page in [raw/owner/2026-10-11-s01-wave2-pages-approval.md](../raw/owner/2026-10-11-s01-wave2-pages-approval.md).

## Context

The master prompt draws the repository as a `ferrum/` tree with `apps/desktop`, `crates/{core, webview-manager, security, resource-manager, telemetry}`, `benchmarks/{workloads, runners, configurations, results}`, `experiments/…`, `analysis/…`, `research/…`, `docs/`, `tests/`, `scripts/` and root documents ([raw/00-master-prompt.md](../raw/00-master-prompt.md) §12).

The git repo is the folder `ferrum-rust-webclient` ([raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md)). It already contains `wiki/`. P0 adds:

- `interactive_plan/` and `plan/approvals.json` ([ADR-0016](adr-0016-interactive-plan-nextjs.md));
- root files `CLAUDE.md`, `STATUS.md`, `PLAN.md` and others ([SCHEMA §4.2](../SCHEMA.md#42-repository-root-outside-wiki)).

The §12 tree has **no place** for several registered components: `comp-baseline-app` (the minimal Tauri baseline, configuration C), the benchmark orchestrator crate ([ADR-0012](adr-0012-benchmark-harness-rust-playwright.md)) and `comp-network-logger` ([ADR-0008](adr-0008-network-logging-metadata-jsonl.md)).

## Options considered

| Option | Pros | Cons |
|---|---|---|
| A. **Repo root = project root**: the §12 tree is placed directly at the root (no nested `ferrum/`), with additive folders for the baseline app and harness | Short paths (helpful on Windows with a space in the parent path). One Cargo workspace at root. `wiki/`, `plan/`, `interactive_plan/` sit beside the code | Deviates cosmetically from the drawn `ferrum/` prefix |
| B. Nested `ferrum/` folder exactly as drawn | Literal match to §12 | An extra path level. `wiki/` and the plan app sit outside the project tree, which is confusing. Longer Windows paths |
| C. Separate repos (app / harness / paper) | Independent histories | Breaks the traceability chain (code ↔ data ↔ paper, master prompt §13). More owner work for remotes |

## Decision

**Option A.** Proposed layout. Crate names are proposals, and component pages are authoritative for `path`/`crate` once approved.

```text
ferrum-rust-webclient/            # repo root = project root
├── Cargo.toml                    # [workspace] members below; shared pinned deps (tauri 2.12.x, webview2-com 0.39, windows 0.62)
├── rust-toolchain.toml           # pinned stable ≥ 1.90 (P1)
├── apps/
│   ├── desktop/                  # Ferrum Tauri app (comp-app-shell frontend: vanilla TS + Vite; src-tauri/ host)
│   └── baseline-tauri/           # minimal Tauri + WebView2 baseline (comp-baseline-app, crate ferrum-baseline)  ← additive to §12
├── crates/
│   ├── core/                     # comp-core (shared types, config, errors)
│   ├── webview-manager/          # comp-webview-manager (+ raw WebView2 COM module, ADR-0019)
│   ├── security/                 # comp-security-engine
│   ├── resource-manager/         # comp-resource-manager
│   └── telemetry/                # comp-telemetry (+ network logger module or sibling crate, see below)
├── benchmarks/
│   ├── workloads/                # synthetic local fixtures (master prompt §9)
│   ├── runners/                  # Rust orchestrator crate + Node/TS Playwright scripts (comp-benchmark-harness)
│   ├── configurations/           # cfg-* definitions
│   └── results/                  # generated, git-ignored except archived runs (copied to wiki/raw/bench/)
├── experiments/{baseline,lifecycle,isolation,security}/
├── analysis/{scripts,notebooks,figures}/      # comp-research-analysis (Python, ADR-0013)
├── research/{literature,methodology,hypotheses,paper}/
├── docs/                         # user/developer docs generated from or linking to wiki/ (wiki is canonical)
├── tests/                        # cross-crate integration + security fixtures
├── scripts/                      # dev scripts (lint-wiki, hash manifest, toolchain check)
├── wiki/  plan/  interactive_plan/            # P0 planning system (not shipped)
└── README.md ARCHITECTURE.md SECURITY.md BENCHMARKING.md REPRODUCIBILITY.md AI_USAGE.md
    LICENSE-MIT LICENSE-APACHE CLAUDE.md STATUS.md PLAN.md RESEARCH_PLAN.md
```

Placement details:

- **Network logger.** `comp-network-logger` goes either in a module of `crates/telemetry/` or in its own crate `crates/network-logger/`. The architecture page for `comp-network-logger` decides. Both fit this ADR.
- **Research docs.** `research/hypotheses/` and `research/methodology/` hold *exported* manuscript-facing material only. The canonical research questions, hypotheses and experiments are wiki pages (`wiki/research/`), so there is no duplication of truth.
- **Root docs.** Root documents are human-facing summaries that link into the wiki ([SCHEMA §4.2](../SCHEMA.md#42-repository-root-outside-wiki)).

## Consequences

### Positive

- Three top-level folders outside master prompt §12 are part of this proposal (see [ov-arch-repo-layout](../architecture/ov-arch-repo-layout.md)): `spikes/` (P1 throwaway spikes, excluded from the workspace with `exclude = ["spikes/*"]`, each with its own lockfile, build output gitignored), `tools/` (planning-tooling scripts in Python) and `plan/snapshots/` (approval snapshots, tracked). Q-106 covers them.
- Every registered component gets a concrete path. Traceability across code, data, analysis and paper stays inside one repo.
- A single workspace pins `webview2-com` 0.39 and `windows` 0.62 once. This matters because they must match Tauri's versions for COM types to unify ([raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md) §1).

### Negative

- The root has no `ferrum/` prefix, unlike the §12 drawing. The deviation is purely cosmetic.
- Several Node projects each have their own lockfile (`apps/desktop`, `benchmarks/runners`, `interactive_plan`). That this does not confuse Turbopack root inference once `turbopack.root` is set is UNVERIFIED[phase-p1-foundation] ([raw/research/nextjs-stack.md](../raw/research/nextjs-stack.md) §3.5).
- That Tauri CLI 2.12.1 builds `apps/desktop/src-tauri` as a workspace member is UNVERIFIED[phase-p1-foundation].

### Follow-ups

- Owner: approved on 2026-10-11 (Q-106 answered in [ov-open-questions](../overview/ov-open-questions.md)). P1 scaffolds exactly this tree and records `cargo metadata` output as evidence.
- Component pages set `path` and `crate` to match.

### Related risks and phases

- `phase-p1-foundation` (scaffold). All `comp-*` pages.

## Verification / evidence

- Proposal source: [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md).
- P1 evidence: `cargo metadata --format-version 1 --no-deps` lists the workspace members, and `cargo build --workspace` succeeds. Both outputs are saved under `wiki/raw/evidence/phase-p1-foundation/`.
