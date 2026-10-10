#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p6.5 (P6 Benchmarks): Test runner.  DRAFT: not ready until P6.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P6 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) The same seed gives the same plan; a test confirms child processes are
                   tracked and failures recorded.
  Why            : Trial order and leftovers can bias results → a Rust runner shuffles trials with a
                   recorded seed, starts each product fresh with a clean profile, tracks all its
                   processes, and records every trial including failures → runs are fair, resumable and
                   complete.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p6.5-test-runner.ps1
  Result         : NOT READY until P6 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P6" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    Unit tests: plan generation is deterministic for a seed and balanced across arms; integration test
    with a dummy target confirms Job Object accounting includes child processes and failed trials appear
    in the manifest.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p6.5' -Title 'Test runner' -Phase 'phase-p6-benchmark-harness' `
    -Why 'runs are fair, resumable and complete.'

# TODO(P6): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'The same seed gives the same plan' 'Planned check; written when P6 starts.'
Add-TodoStep 'A test confirms child processes are tracked and failures recorded' 'Planned check; written when P6 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P6'
