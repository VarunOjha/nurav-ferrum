---
id: adr-0011
type: decision
title: "git + GitHub Actions (windows-latest), dual MIT OR Apache-2.0 license; Claude never pushes"
status: accepted
updated: 2026-10-19
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/owner/2026-10-08-s01-wave0.md
related: [adr-0003, adr-0005, adr-0021, adr-0018, phase-p1-foundation, comp-core]
approvable: true
date: 2026-10-08
decided_by: owner
supersedes: []
options:
  - "git + GitHub Actions on windows-latest, dual MIT OR Apache-2.0"
  - "git only, no CI"
  - "Other CI provider or single license"
phase: phase-p0-planning
tags: [git, ci, license, repository]
unverified:
  - claim: "GitHub-hosted windows-latest runners provide an MSVC toolchain and a WebView2 runtime suitable for building and smoke-testing a Tauri 2 app"
    verify_in: phase-p6-benchmark-harness
  - claim: "cargo-deny / cargo-audit (dependency auditing) run on windows-latest and can check MIT OR Apache-2.0 compatibility of dependencies"
    verify_in: phase-p6-benchmark-harness
---

# ADR-0011: git + GitHub Actions, dual MIT OR Apache-2.0; Claude never pushes

## Context

The master prompt requires:

- reproducible builds, dependency auditing, automated formatting, Clippy and CI workflows ([raw/00-master-prompt.md](../raw/00-master-prompt.md) §15);
- an open-source license file (`LICENSE`, §12).

Scoping question Q8 asked about the repository, CI and license. The owner chose **"git + GitHub Actions (windows-latest), dual MIT OR Apache-2.0; Claude never pushes; owner creates remote"** ([raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md)). The local repo was initialised with `git init -b main` in session 1 (same raw file). No remote exists yet.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| A. **git + GitHub Actions on windows-latest; MIT OR Apache-2.0** | Matches the target OS. Rust-ecosystem standard dual license. Free CI for public repos | Hosted runners are shared and noisy, so they are useless for benchmarks. GUI/WebView2 testing on runners may be limited (see the CI scope item under Decision) |
| B. git only, no CI | Simplest | Fails master prompt §15 (CI workflows) |
| C. Other CI, or a single license | — | No advantage stated. Not the owner's choice |

## Decision

### Owner decision (verbatim)

As recorded in [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md), scoping answer Q8 (that file records the owner's words verbatim-in-substance):

> Q8 Repo / CI / License: **git + GitHub Actions (windows-latest), dual MIT OR Apache-2.0**; Claude never pushes; owner creates remote

This quoted choice is what `decided_by: owner` and `status: accepted` cover (SCHEMA §10.4 rule 3(b)).

### Claude elaboration (binding only once the owner APPROVES this ADR)

Everything below in this section is Claude's elaboration of the owner's choice. Under SCHEMA §10.4 it binds implementation only after the owner approves this ADR (given in Claude Code and recorded in `plan/approvals.json`, adr-0023); until then it is a proposal.

**Option A.**

1. **Pushing.** **Claude never runs `git push`**, never creates or modifies remotes, and never changes GitHub settings. The owner creates the GitHub remote and pushes.
2. **CI scope** (workflow written in P1, `windows-latest`):
   - `cargo fmt --check`;
   - `cargo clippy -- -D warnings`;
   - `cargo test`;
   - dependency audit (cargo-deny or cargo-audit; tool chosen in P1);
   - the plan app's lint, unit tests and E2E;
   - frontend lint and tests.

   Whether runners can build and smoke-test the Tauri/WebView2 app is UNVERIFIED[phase-p6-benchmark-harness]. Whether the audit tools run there is also UNVERIFIED[phase-p6-benchmark-harness]. (Re-targeted in P5, in P4, in P3 and in P2: the first push is still deferred, Q-221; re-targeted in P1: the owner deferred the first push; locally cargo-deny checks the licence allow list, [cargo-deny run](../raw/evidence/phase-p1-foundation/cargo-deny-p1.12.txt).)
3. **CI never runs benchmarks.** Shared runners are not a controlled environment ([ADR-0009](adr-0009-benchmark-hardware-energy.md)). CI may run benchmark-harness *unit* tests and fixture validation only.
4. **License.** Dual `MIT OR Apache-2.0`, with `LICENSE-MIT` and `LICENSE-APACHE` at the repo root plus `license = "MIT OR Apache-2.0"` in every crate's `Cargo.toml`. The master prompt's single `LICENSE` file name is replaced by the two files. This is a minor deviation the owner can see.
5. **Commits.** The owner answered Q-104 on 2026-10-08 ([raw/owner/2026-10-08-s01-wave0.md](../raw/owner/2026-10-08-s01-wave0.md)): "**Yes, starting now in P0** — one local commit per verified task; never push". Claude makes one local commit per verified task, ending with the session's attribution trailer, and never pushes ([ops-git-conventions](../operations/ops-git-conventions.md)).
6. **What is never committed:** browser profiles, user-data folders, auth tokens, network logs from personal browsing, or raw personal telemetry (master prompt §12). `.gitignore` covers these from P1.

## Consequences

### Positive

- Standard, permissive licensing that suits a research artifact and Rust-ecosystem reuse.
- The owner controls everything that leaves the machine.

### Negative

- Without a remote, CI cannot run. The P1 gate either waits for the owner to create the remote (Q-105) or accepts local equivalents of the CI commands as evidence, with the first CI run deferred and recorded.
- Before Q-104 was answered (2026-10-08), resumability rested on STATUS and the log only ([ADR-0003](adr-0003-multi-session-resumability.md)). Local commits are now authorised, so git history is available for recovery.

### Follow-ups

- P1: `.gitignore`, license files, `.github/workflows/ci.yml`, dependency-audit config, plus the CI pass recorded as evidence (a link to the run, or local command output if there is no remote yet).
- Q-104 (local commits) is answered (yes, see Decision item 5). Q-105 (remote: name, visibility, timing) is open, in [ov-open-questions](../overview/ov-open-questions.md). Recommended default for Q-105: before P1 exit the owner creates an **empty** repository (no README or license, to avoid merge conflicts); it stays private until the M1 review (P2 exit), when the owner decides on public. Until a remote exists, the P1 gate accepts local outputs of the CI commands and the first hosted CI run is recorded later as additional evidence.

### Related risks and phases

- `phase-p1-foundation` (CI + scaffold). It also underpins every later gate's "automated" checks.

## Verification / evidence

- Owner answer Q8: [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md).
- P1 evidence: CI workflow file, a passing run (or local-equivalent output) under `wiki/raw/evidence/phase-p1-foundation/`, and both license files present.
- Ongoing owner spot-check: no `push` operation appears in `wiki/log.md` entries or in session transcripts, and `git remote -v` changes only when the owner makes them.
