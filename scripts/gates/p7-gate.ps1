#Requires -Version 7.0
<#
.SYNOPSIS
  Gate check for phase P7 (Smart tab sleeping): what must be true before P7 can end.  DRAFT: not ready until P7.

.DESCRIPTION
  Status         : DRAFT. The real gate is written when P7 starts; until then it only lists the planned
                   checks and ends NOT READY.
  What it checks : (planned) every task check of P7, then: Code checks; Library check; Safety suite;
                   Sleep-action tests; Earlier features; Statistics tests; Wiki check. Steps only you can do are
                   listed as YOURS.
  Why            : Code and tests pass → safety guards hold under every strategy → sleep actions behave as
                   tested → earlier features still work → you work with smart sleeping on and report any
                   lost state → you approve weights, predictions and the novelty check → you approve. Only
                   then does P8 start.
  What it changes: nothing (once real, -SaveEvidence saves the printout as masked evidence).
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/gates/p7-gate.ps1
  Result         : NOT READY until P7 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P7" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). scripts/run-all-checks.ps1 -Phase P7 starts this same
                   script. The planned automatic gate items, from the test_gate of the phase page:
    - cargo fmt --all -- --check
    - cargo clippy --workspace --all-targets -- -D warnings
    - cargo test --workspace (state machine, policies, signal providers)
    - cargo deny check
    - apps/desktop shell: npm run lint && npm run typecheck && npm run test
    - Tauri release build of apps/desktop
    - Lifecycle safety suite (p7.4)
    - Mechanism integration tests (p7.3)
    - Security suite, telemetry validation suite, P3/P2 regressions
    - analysis: pytest
    - cd interactive_plan && npm run lint:wiki
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'P7-gate' -Title 'Smart tab sleeping: end-of-phase gate' -Phase 'phase-p7-lifecycle' `
    -Why 'only a passing gate and your approval let the next phase start.'

# TODO(P7): run every task script of P7 with Invoke-ChildScript, then turn each row into an Invoke-Step.
Add-TodoStep 'Every task check of P7 passes' 'Planned: runs each scripts/verify/p7.*.ps1 in turn.'
Add-TodoStep 'Code checks' 'Planned: Code is tidy and warning-free, all automatic tests pass, and the release build works.'
Add-TodoStep 'Library check' 'Planned: Third-party libraries have acceptable licences and no known security problems.'
Add-TodoStep 'Safety suite' 'Planned: No guarded tab is ever closed, in tests or in the long run.'
Add-TodoStep 'Sleep-action tests' 'Planned: Each action leaves the web view in the expected state.'
Add-TodoStep 'Earlier features' 'Planned: Security, measurement accuracy, tabs and browsing tests still pass.'
Add-TodoStep 'Statistics tests' 'Planned: The analysis code still passes its tests.'
Add-TodoStep 'Wiki check' 'Planned: The plan pages are consistent and have no broken links.'
Add-YourStep 'Your daily-use test' 'You work with smart sleeping on and report any lost state or surprising close.'
Add-YourStep 'Your three approvals' 'You approved the weights, the predictions and the novelty check.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P7'
