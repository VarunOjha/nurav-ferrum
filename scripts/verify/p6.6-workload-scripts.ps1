#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p6.6 (P6 Benchmarks): Scripts that drive each workload.  DRAFT: not ready until P6.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P6 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) Each script runs once on each product, or the unsupported feature is named
                   and recorded.
  Why            : Each product must be driven the same way → one browser-automation script (Playwright)
                   per workload, connecting to every product through the same debugging channel →
                   differences come from the products, not the driver.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p6.6-workload-scripts.ps1
  Result         : NOT READY = exit 2 until P6; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P6" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Each script runs once against each configuration in a dry run and exits 0, or the failure is recorded
    with the unsupported feature named.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p6.6' -Title 'Scripts that drive each workload' -Phase 'phase-p6-benchmark-harness' `
    -Why 'differences come from the products, not the driver.'

# TODO(P6): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Each script runs once on each product, or the unsupported feature is named and recorded' 'Planned check; written when P6 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P6'
