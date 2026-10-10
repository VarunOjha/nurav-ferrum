#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p6.12 (P6 Benchmarks): Write predictions before testing.  DRAFT: not ready until P6.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P6 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) Every prediction is recorded and approved by you before the first campaign
                   starts.
  Why            : Deciding what counts as success after seeing data is biased → write each prediction and
                   its meaningful-difference threshold first, and you approve them → results cannot be
                   bent to fit.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p6.12-write-predictions-before.ps1
  Result         : NOT READY = exit 2 until P6; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P6" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Every hypothesis linked from C1 experiments has status preregistered and an APPROVED effective state
    in plan/approvals.json before p6.13 starts.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p6.12' -Title 'Write predictions before testing' -Phase 'phase-p6-benchmark-harness' `
    -Why 'results cannot be bent to fit.'

# TODO(P6): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Every prediction is recorded and approved by you before the first campaign starts' 'Planned check; written when P6 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P6'
