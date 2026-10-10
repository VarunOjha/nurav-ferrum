#Requires -Version 7.0
<#
.SYNOPSIS
  Gate check for phase P3 (Tabs and sessions): what must be true before P3 can end.  DRAFT: not ready until P3.

.DESCRIPTION
  Status         : DRAFT. The real gate is written when P3 starts; until then it only lists the planned
                   checks and ends NOT READY (exit 2).
  What it checks : (planned) every task check of P3, then: Formatting and code warnings; Tests; Licences
                   and alerts; Shell checks; Release build; Integration suite; Earlier tests again; Wiki
                   check. Your own checks are listed as YOURS.
  Why            : Tabs multiply every P2 behaviour → rerun P2's tests plus the new suite, and test
                   restore after a forced kill → you use it for a real working session → only then does
                   security work start in P4.
  What it changes: nothing (once real, -SaveEvidence saves the printout as masked evidence).
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/run-all-checks.ps1 -Phase P3
  Result         : NOT READY = exit 2 until P3; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P3" is the expected result for now.

  For Claude - the planned automatic gate items, from the test_gate of the phase page:
    - cargo fmt --all -- --check
    - cargo clippy --workspace --all-targets -- -D warnings
    - cargo test --workspace
    - cargo deny check
    - apps/desktop shell: npm run lint && npm run typecheck && npm run test
    - Tauri release build of apps/desktop
    - P3 integration suite (p3.11)
    - P2 smoke suite and IPC denial test (regression)
    - cd interactive_plan && npm run lint:wiki
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'P3-gate' -Title 'Tabs and sessions: end-of-phase gate' -Phase 'phase-p3-tabs-sessions' `
    -Why 'only a passing gate and your approval let the next phase start.'

# TODO(P3): run every task script of P3 with Invoke-ChildScript, then turn each row into an Invoke-Step.
Add-TodoStep 'Every task check of P3 passes' 'Planned: runs each scripts/verify/p3.*.ps1 in turn.'
Add-TodoStep 'Formatting and code warnings' 'Planned: Rust code is clean.'
Add-TodoStep 'Tests' 'Planned: Workspace tests pass.'
Add-TodoStep 'Licences and alerts' 'Planned: Dependencies are allowed and have no open alerts.'
Add-TodoStep 'Shell checks' 'Planned: Shell style, types and tests pass.'
Add-TodoStep 'Release build' 'Planned: The app you would ship builds.'
Add-TodoStep 'Integration suite' 'Planned: Tabs, restore, profiles, history, downloads, settings and sidebar work.'
Add-TodoStep 'Earlier tests again' 'Planned: P2''s quick app tests and the bridge lockdown still pass.'
Add-TodoStep 'Wiki check' 'Planned: The wiki has zero errors.'
Add-YourStep 'Your working session' 'You used eight or more tabs, every shortcut, a kill-and-restore and a real download.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P3'
