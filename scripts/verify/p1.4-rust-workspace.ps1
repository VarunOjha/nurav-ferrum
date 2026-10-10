#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p1.4 (P1 Foundation): Create the empty Rust workspace.

.DESCRIPTION
  What it checks : the Rust workspace exists at the repo root (Cargo.toml with resolver 2 that leaves the
                   throw-away spikes out), the Rust version is pinned (rust-toolchain.toml), the planned empty
                   libraries exist (core, webview-manager, security, resource-manager, telemetry), and then
                   four Rust checks pass with no warnings: build, tests, formatting, and the code-warning
                   checker (clippy, with every warning treated as an error).
  Why            : code needs a home → empty libraries in the planned folders with a pinned Rust version give
                   every later task a place to go.
  What it changes: nothing in the repo. Builds write only to the ignored target/ folder.
  How long       : about 1 minute the first time, seconds after that.
  How to run     : pwsh -NoProfile -File scripts/verify/p1.4-rust-workspace.ps1
  Result         : PASS = exit 0, FAIL = exit 1, NOT READY = exit 2 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p1.4 check failed".
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p1.4' -Title 'Create the empty Rust workspace' -Phase 'phase-p1-foundation' `
    -Why 'every later task needs a home with a pinned Rust version.'

Invoke-Step 'Workspace file exists, resolver 2, spikes left out' {
    Assert-CargoWorkspace
    $t = Read-RepoText 'Cargo.toml'
    if ($t -notmatch '(?m)^\[workspace\]') { Stop-Fail 'Cargo.toml has no [workspace] section.' }
    if ($t -notmatch 'resolver\s*=\s*"2"') { Stop-Fail 'Cargo.toml does not set resolver = "2".' }
    if ($t -notmatch 'exclude\s*=\s*\[[^\]]*"spikes/\*"') { Stop-Fail 'Cargo.toml does not exclude "spikes/*".' }
    'Cargo.toml ok'
}

Invoke-Step 'Rust version pinned (rust-toolchain.toml)' {
    $t = Read-RepoText 'rust-toolchain.toml'
    if ($t -notmatch 'channel\s*=\s*"(\d+\.\d+(\.\d+)?)"') { Stop-Fail 'rust-toolchain.toml does not pin an exact version (channel = "1.x.y").' }
    "pinned to $($Matches[1])"
}

Invoke-Step 'The planned empty libraries exist' {
    $crates = 'core', 'webview-manager', 'security', 'resource-manager', 'telemetry'
    $missing = @($crates | Where-Object { -not (Test-Path -LiteralPath (Get-RepoPath "crates/$_/Cargo.toml")) })
    if ($missing.Count) { Stop-Fail "Missing libraries: $(($missing | ForEach-Object { "crates/$_" }) -join ', ')." }
    "crates/: $($crates -join ', ')"
}

Invoke-Step 'Build passes' { [void](Assert-Cargo @('build', '--workspace', '--locked')); 'cargo build: exit 0' }
Invoke-Step 'Tests pass' { [void](Assert-Cargo @('test', '--workspace', '--locked')); 'cargo test: exit 0' }
Invoke-Step 'Formatting is consistent' { [void](Assert-Cargo @('fmt', '--all', '--', '--check')); 'cargo fmt --check: exit 0' }
Invoke-Step 'No code warnings' {
    [void](Assert-Cargo @('clippy', '--workspace', '--all-targets', '--locked', '--', '-D', 'warnings')); 'cargo clippy: no warnings'
}

Complete-Check -SaveEvidence:$SaveEvidence
