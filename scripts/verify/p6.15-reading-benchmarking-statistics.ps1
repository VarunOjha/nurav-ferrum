#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p6.15 (P6 Benchmarks): Reading: benchmarking and statistics.  DRAFT: not ready until P6.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P6 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) New research notes saved; method pages cite them.
  Why            : Methods must follow good practice → read the literature on benchmark methods and
                   performance statistics → the method pages cite it.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p6.15-reading-benchmarking-statistics.ps1
  Result         : NOT READY until P6 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P6" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    New raw research notes; methodology pages cite them.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p6.15' -Title 'Reading: benchmarking and statistics' -Phase 'phase-p6-benchmark-harness' `
    -Why 'the method pages cite it.'

# TODO(P6): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'New research notes saved' 'Planned check; written when P6 starts.'
Add-TodoStep 'Method pages cite them' 'Planned check; written when P6 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P6'
