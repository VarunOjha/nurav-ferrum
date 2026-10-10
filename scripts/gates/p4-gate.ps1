#Requires -Version 7.0
<#
.SYNOPSIS
  Gate check for phase P4 (Security): what must be true before P4 can end.  DRAFT: not ready until P4.

.DESCRIPTION
  Status         : DRAFT. The real gate is written when P4 starts; until then it only lists the planned
                   checks and ends NOT READY (exit 2).
  What it checks : (planned) every task check of P4, then: Formatting and code warnings; Tests; Licences
                   and alerts; Rules coverage; Security suite; Earlier tests again; Shell checks; Release
                   build; No-security switch absent; Isolation modes; Wiki check. Your own checks are
                   listed as YOURS.
  Why            : Security claims need proof → attack-style tests try the known bypasses, every rule
                   branch is covered, and the release build is scanned → you accept the 'not enforced'
                   list → only then does P5 start.
  What it changes: nothing (once real, -SaveEvidence saves the printout as masked evidence).
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/run-all-checks.ps1 -Phase P4
  Result         : NOT READY = exit 2 until P4; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P4" is the expected result for now.

  For Claude - the planned automatic gate items, from the test_gate of the phase page:
    - cargo fmt --all -- --check
    - cargo clippy --workspace --all-targets -- -D warnings
    - cargo test --workspace
    - cargo deny check
    - Policy engine coverage report (p4.2)
    - Security suite (p4.11)
    - P3 integration suite, P2 smoke suite and IPC denial test (regression)
    - apps/desktop shell: npm run lint && npm run typecheck && npm run test
    - Tauri release build of apps/desktop
    - Release build security-static check: cfg-ferrum-nosecurity-bench absent (p4.16)
    - Isolation-mode integration test (p4.15)
    - cd interactive_plan && npm run lint:wiki
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'P4-gate' -Title 'Security: end-of-phase gate' -Phase 'phase-p4-security' `
    -Why 'only a passing gate and your approval let the next phase start.'

# TODO(P4): run every task script of P4 with Invoke-ChildScript, then turn each row into an Invoke-Step.
Add-TodoStep 'Every task check of P4 passes' 'Planned: runs each scripts/verify/p4.*.ps1 in turn.'
Add-TodoStep 'Formatting and code warnings' 'Planned: Rust code is clean.'
Add-TodoStep 'Tests' 'Planned: Workspace tests pass.'
Add-TodoStep 'Licences and alerts' 'Planned: Dependencies are allowed and have no open alerts.'
Add-TodoStep 'Rules coverage' 'Planned: Every rules-engine decision branch is tested.'
Add-TodoStep 'Security suite' 'Planned: Each of the ten security items has a passing test.'
Add-TodoStep 'Earlier tests again' 'Planned: P2 and P3 suites and the bridge lockdown still pass.'
Add-TodoStep 'Shell checks' 'Planned: Shell style, types and tests pass.'
Add-TodoStep 'Release build' 'Planned: The app you would ship builds.'
Add-TodoStep 'No-security switch absent' 'Planned: The release build cannot skip security.'
Add-TodoStep 'Isolation modes' 'Planned: Each mode separates what it should.'
Add-TodoStep 'Wiki check' 'Planned: The wiki has zero errors.'
Add-YourStep 'Your checks' 'You read the threat model, blocked a site, and saw a camera or location request denied.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P4'
