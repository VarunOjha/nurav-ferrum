#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p7.10 (P7 Smart tab sleeping): Write predictions before testing.  DRAFT: not ready until P7.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P7 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) Every prediction is recorded and approved by you before the campaign starts.
  Why            : Deciding what counts as success after seeing data is biased → write each prediction and
                   its meaningful-difference threshold first, and you approve them → results cannot be
                   bent to fit.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p7.10-write-predictions-before.ps1
  Result         : NOT READY = exit 2 until P7; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P7" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Linked hypotheses have status preregistered and an APPROVED effective state before p7.11 starts.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p7.10' -Title 'Write predictions before testing' -Phase 'phase-p7-lifecycle' `
    -Why 'results cannot be bent to fit.'

# TODO(P7): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Every prediction is recorded and approved by you before the campaign starts' 'Planned check; written when P7 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P7'
