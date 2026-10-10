#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p8.9 (P8 Research paper): Report failed experiments too.  DRAFT: not ready until P8.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P8 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) Every failed or stopped run is mentioned in the paper or its appendix.
  Why            : Hiding failures is cherry-picking → list every failed or stopped run from the log and
                   run records in the paper or its appendix → the record is honest.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p8.9-report-failed-experiments.ps1
  Result         : NOT READY until P8 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P8" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    Every aborted or failed run in raw/bench is mentioned in the paper or its supplementary material.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p8.9' -Title 'Report failed experiments too' -Phase 'phase-p8-research-paper' `
    -Why 'the record is honest.'

# TODO(P8): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Every failed or stopped run is mentioned in the paper or its appendix' 'Planned check; written when P8 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P8'
