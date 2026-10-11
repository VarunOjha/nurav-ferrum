# Reproducibility

How to rebuild Ferrum's results on another machine. Canonical details live in the wiki.

## Environment capture

- **Toolchain versions** are recorded per phase. P1 recorded Rust 1.99.0 (x86_64-pc-windows-msvc), cargo,
  Visual Studio Build Tools 2022 17.14, Node 24.20.0, npm, Python, git, PowerShell 7.6.6 and cargo-deny 0.20.2
  ([toolchain.txt](wiki/raw/evidence/phase-p1-foundation/toolchain.txt),
  [toolchain-details.txt](wiki/raw/evidence/phase-p1-foundation/toolchain-details.txt)).
- **Machine inventory** (processor, memory, graphics, displays, Windows build, power plan, WebView2, Edge and
  Chrome versions): [environment.md](wiki/raw/evidence/phase-p1-foundation/environment.md).
- Setup commands: [ops-environment-setup](wiki/operations/ops-environment-setup.md).

## Version pinning

- Rust is pinned by `rust-toolchain.toml`; every cargo command uses `--locked` with the committed `Cargo.lock`.
- npm packages are pinned to exact versions with committed `package-lock.json` files.
- Spike pins and the registry check they came from:
  [registry-versions-2026-10-11.txt](wiki/raw/evidence/phase-p1-foundation/registry-versions-2026-10-11.txt).
- The WebView2 runtime updates itself (Evergreen). Whether benchmarks use Evergreen or a fixed version is an open
  owner question (Q-119 in [open questions](wiki/overview/ov-open-questions.md)).

## Evidence and integrity

Every gate's raw output is saved under `wiki/raw/evidence/<phase>/`, masked for machine values, and fingerprinted in
`wiki/raw/MANIFEST.sha256`; raw files are never edited ([SCHEMA](wiki/SCHEMA.md) §3.1). Check scripts for every task
are in `scripts/verify/` and for every phase gate in `scripts/gates/`
([adr-0025](wiki/decisions/adr-0025-check-scripts-powershell-7.md)).
