#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p7.11 (P7 Smart tab sleeping): Strategy campaign.  DRAFT: not ready until P7.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P7 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) A complete raw-data folder with every trial and checksums; no results stated
                   yet.
  Why            : Bench and predictions are ready → run the four strategies on identical workloads, with
                   Chrome and Edge as shipped for reference → raw data for P8.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p7.11-strategy-campaign.ps1
  Result         : NOT READY = exit 2 until P7; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P7" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    raw/bench/<run-id>/ with manifest, every trial, checksums; experiment status complete with
    results_ref; no result statements yet.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p7.11' -Title 'Strategy campaign' -Phase 'phase-p7-lifecycle' `
    -Why 'raw data for P8.'

# TODO(P7): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'A complete raw-data folder with every trial and checksums' 'Planned check; written when P7 starts.'
Add-TodoStep 'No results stated yet' 'Planned check; written when P7 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P7'
