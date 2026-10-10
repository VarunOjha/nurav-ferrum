#Requires -Version 7.0
<#
.SYNOPSIS
  Gate check for phase P2 (First working app): what must be true before P2 can end.  DRAFT: not ready until P2.

.DESCRIPTION
  Status         : DRAFT. The real gate is written when P2 starts; until then it only lists the planned
                   checks and ends NOT READY (exit 2).
  What it checks : (planned) every task check of P2, then: Formatting and code warnings; Tests; Licences
                   and alerts; Shell checks; Release build; Bridge lockdown test; Quick app tests; Wiki
                   check. Your own checks are listed as YOURS.
  Why            : Every website view can reach the app's channel → first prove websites are refused, then
                   prove navigation with small tests, quick whole-app tests and a release build → you try
                   it on real sites → only then do tabs start in P3.
  What it changes: nothing (once real, -SaveEvidence saves the printout as masked evidence).
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/run-all-checks.ps1 -Phase P2
  Result         : NOT READY = exit 2 until P2; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P2" is the expected result for now.

  For Claude - the planned automatic gate items, from the test_gate of the phase page:
    - cargo fmt --all -- --check
    - cargo clippy --workspace --all-targets -- -D warnings
    - cargo test --workspace
    - cargo deny check
    - apps/desktop shell: npm run lint && npm run typecheck && npm run test
    - Tauri release build of apps/desktop
    - IPC denial integration test (p2.3)
    - Smoke suite (p2.15) covering p2.7 to p2.13
    - cd interactive_plan && npm run lint:wiki
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'P2-gate' -Title 'First working app: end-of-phase gate' -Phase 'phase-p2-minimal-container' `
    -Why 'only a passing gate and your approval let the next phase start.'

# TODO(P2): run every task script of P2 with Invoke-ChildScript, then turn each row into an Invoke-Step.
Add-TodoStep 'Every task check of P2 passes' 'Planned: runs each scripts/verify/p2.*.ps1 in turn.'
Add-TodoStep 'Formatting and code warnings' 'Planned: Rust code is clean.'
Add-TodoStep 'Tests' 'Planned: Workspace tests pass.'
Add-TodoStep 'Licences and alerts' 'Planned: Dependencies are allowed and have no open alerts.'
Add-TodoStep 'Shell checks' 'Planned: Shell style, types and tests pass.'
Add-TodoStep 'Release build' 'Planned: The app you would ship builds.'
Add-TodoStep 'Bridge lockdown test' 'Planned: No website can call the app.'
Add-TodoStep 'Quick app tests' 'Planned: Navigation, errors, redirects, links, cookies and the sign-in banner work.'
Add-TodoStep 'Wiki check' 'Planned: The wiki has zero errors.'
Add-YourStep 'Your checklist' 'You browsed five HTTPS sites, tried a mail link, a restart and going offline.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P2'
