#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p6.13 (P6 Benchmarks): First test campaign.  DRAFT: not ready until P6.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P6 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) Each experiment has a complete raw-data folder with every trial and
                   checksums; no results stated yet.
  Why            : The bench is ready and checked → run the footprint, startup, page-load, smoothness,
                   reliability, security-cost and isolation-cost experiments (and energy if supported) on
                   Chrome, Edge, bare Tauri and Ferrum without sleeping → raw data for P8 and a reference
                   for P7.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p6.13-first-test-campaign.ps1
  Result         : NOT READY = exit 2 until P6; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P6" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Each experiment has a raw/bench/<run-id>/ folder with manifest, every trial (failures included) and
    checksums; experiment status complete with results_ref; no result statements written anywhere yet.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p6.13' -Title 'First test campaign' -Phase 'phase-p6-benchmark-harness' `
    -Why 'raw data for P8 and a reference for P7.'

# TODO(P6): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Each experiment has a complete raw-data folder with every trial and checksums' 'Planned check; written when P6 starts.'
Add-TodoStep 'No results stated yet' 'Planned check; written when P6 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P6'
