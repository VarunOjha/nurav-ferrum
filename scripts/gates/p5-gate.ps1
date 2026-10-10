#Requires -Version 7.0
<#
.SYNOPSIS
  Gate check for phase P5 (Measurement): what must be true before P5 can end.  DRAFT: not ready until P5.

.DESCRIPTION
  Status         : DRAFT. The real gate is written when P5 starts; until then it only lists the planned
                   checks and ends NOT READY (exit 2).
  What it checks : (planned) every task check of P5, then: Code checks; Library check; Accuracy suite;
                   File format check; Network log tests; Earlier features; Wiki check. Your own checks are
                   listed as YOURS.
  Why            : Code and tests pass → the meters match known values → exported files match the format →
                   the network log holds no private data → earlier features still work → you browse with
                   logging on and check the log folder → you approve. Only then does P6 start.
  What it changes: nothing (once real, -SaveEvidence saves the printout as masked evidence).
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/run-all-checks.ps1 -Phase P5
  Result         : NOT READY = exit 2 until P5; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P5" is the expected result for now.

  For Claude - the planned automatic gate items, from the test_gate of the phase page:
    - cargo fmt --all -- --check
    - cargo clippy --workspace --all-targets -- -D warnings
    - cargo test --workspace
    - cargo deny check
    - apps/desktop shell: npm run lint && npm run typecheck && npm run test
    - Tauri release build of apps/desktop
    - Telemetry validation suite (p5.4) against ground-truth helpers
    - Export schema validation (p5.1)
    - Network logger integration and negative tests (p5.9)
    - Security suite, P3 integration suite, P2 smoke suite (regression)
    - cd interactive_plan && npm run lint:wiki
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'P5-gate' -Title 'Measurement: end-of-phase gate' -Phase 'phase-p5-telemetry' `
    -Why 'only a passing gate and your approval let the next phase start.'

# TODO(P5): run every task script of P5 with Invoke-ChildScript, then turn each row into an Invoke-Step.
Add-TodoStep 'Every task check of P5 passes' 'Planned: runs each scripts/verify/p5.*.ps1 in turn.'
Add-TodoStep 'Code checks' 'Planned: Code is tidy and warning-free, all automatic tests pass, and the release build works.'
Add-TodoStep 'Library check' 'Planned: Third-party libraries have acceptable licences and no known security problems.'
Add-TodoStep 'Accuracy suite' 'Planned: Memory and CPU readings match known values within the written tolerances.'
Add-TodoStep 'File format check' 'Planned: Exported files match the published format.'
Add-TodoStep 'Network log tests' 'Planned: Exactly the expected requests are logged, with no headers or content.'
Add-TodoStep 'Earlier features' 'Planned: Security, tabs and basic browsing tests still pass.'
Add-TodoStep 'Wiki check' 'Planned: The plan pages are consistent and have no broken links.'
Add-YourStep 'Your privacy check' 'You browse for a session with logging on and find nothing in the log that should not be there.'
Add-YourStep 'Your settings check' 'The on/off switches behave as described.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P5'
