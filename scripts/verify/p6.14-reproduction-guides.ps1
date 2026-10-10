#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p6.14 (P6 Benchmarks): Reproduction guides.  DRAFT: not ready until P6.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P6 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) Following the guide on a fresh copy for one workload gives a valid run
                   record.
  Why            : Others must be able to repeat our tests → write how-to guides for benchmarking and for
                   reproducing a campaign on a clean PC → the research can be checked independently.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p6.14-reproduction-guides.ps1
  Result         : NOT READY until P6 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P6" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    Owner or Claude follows REPRODUCIBILITY.md for one workload in a fresh checkout and gets a valid run
    manifest.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p6.14' -Title 'Reproduction guides' -Phase 'phase-p6-benchmark-harness' `
    -Why 'the research can be checked independently.'

# TODO(P6): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Following the guide on a fresh copy for one workload gives a valid run record' 'Planned check; written when P6 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P6'
