#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p7.6 (P7 Smart tab sleeping): Cost-aware strategy.  DRAFT: not ready until P7.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P7 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) Score tests pass; weights and calibration method saved before the campaign;
                   calibration and test workloads do not overlap.
  Why            : Smarter choices weigh memory saved, energy and restore delay → combine them in one
                   weighted score (energy weight zero if energy cannot be measured) and fix the weights on
                   separate calibration workloads → the strategy is not tuned to the test it is judged on.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p7.6-cost-aware-strategy.ps1
  Result         : NOT READY = exit 2 until P7; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P7" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Unit tests on the objective computation; calibration procedure and chosen weights committed before C2;
    the calibration and evaluation workload sets are listed and disjoint.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p7.6' -Title 'Cost-aware strategy' -Phase 'phase-p7-lifecycle' `
    -Why 'the strategy is not tuned to the test it is judged on.'

# TODO(P7): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Score tests pass' 'Planned check; written when P7 starts.'
Add-TodoStep 'Weights and calibration method saved before the campaign' 'Planned check; written when P7 starts.'
Add-TodoStep 'Calibration and test workloads do not overlap' 'Planned check; written when P7 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P7'
