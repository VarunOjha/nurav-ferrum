#Requires -Version 7.0
<#
.SYNOPSIS
  Gate check for phase P6 (Benchmarks): what must be true before P6 can end.  DRAFT: not ready until P6.

.DESCRIPTION
  Status         : DRAFT. The real gate is written when P6 starts; until then it only lists the planned
                   checks and ends NOT READY (exit 2).
  What it checks : (planned) every task check of P6, then: Code checks; Library check; Fair settings
                   report; Same input, same output; Noise check; Campaign data; Earlier features; Wiki
                   check. Your own checks are listed as YOURS.
  Why            : Code and tests pass → settings are proven fair → test pages and analysis give the same
                   output every time → noise level known → you approve the predictions and check the PC →
                   first campaign data is complete → you approve. Only then does P7 start.
  What it changes: nothing (once real, -SaveEvidence saves the printout as masked evidence).
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/run-all-checks.ps1 -Phase P6
  Result         : NOT READY = exit 2 until P6; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P6" is the expected result for now.

  For Claude - the planned automatic gate items, from the test_gate of the phase page:
    - cargo fmt --all -- --check
    - cargo clippy --workspace --all-targets -- -D warnings
    - cargo test --workspace (orchestrator plan generation, Job Object integration)
    - cargo deny check
    - apps/desktop shell: npm run lint && npm run typecheck && npm run test
    - Tauri release build of apps/desktop
    - benchmarks/runners: npm run lint && npm run typecheck && npm run test
    - analysis: pytest
    - Configuration schema validation and config diff report (p6.4)
    - Workload determinism test (p6.2)
    - Analysis determinism check (p6.10)
    - Security suite and P3/P2 regressions
    - cd interactive_plan && npm run lint:wiki
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'P6-gate' -Title 'Benchmarks: end-of-phase gate' -Phase 'phase-p6-benchmark-harness' `
    -Why 'only a passing gate and your approval let the next phase start.'

# TODO(P6): run every task script of P6 with Invoke-ChildScript, then turn each row into an Invoke-Step.
Add-TodoStep 'Every task check of P6 passes' 'Planned: runs each scripts/verify/p6.*.ps1 in turn.'
Add-TodoStep 'Code checks' 'Planned: Code is tidy and warning-free, all automatic tests pass, and the release build works.'
Add-TodoStep 'Library check' 'Planned: Third-party libraries have acceptable licences and no known security problems.'
Add-TodoStep 'Fair settings report' 'Planned: Products differ only in the documented ways.'
Add-TodoStep 'Same input, same output' 'Planned: Test pages and the analysis give identical results on every run.'
Add-TodoStep 'Noise check' 'Planned: Noise level measured; trial counts justified.'
Add-TodoStep 'Campaign data' 'Planned: Every planned trial recorded, failures included, none dropped.'
Add-TodoStep 'Earlier features' 'Planned: Security, tabs and browsing tests still pass.'
Add-TodoStep 'Wiki check' 'Planned: The plan pages are consistent and have no broken links.'
Add-YourStep 'Your fairness review' 'You confirm no Chrome or Edge saver was switched off to help Ferrum.'
Add-YourStep 'Your prediction approval' 'You approved the predictions before any comparison ran.'
Add-YourStep 'Your PC check' 'Power plan, display and background apps are set as the guide says.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P6'
