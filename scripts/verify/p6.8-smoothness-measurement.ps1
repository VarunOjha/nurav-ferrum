#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p6.8 (P6 Benchmarks): Smoothness measurement.  DRAFT: not ready until P6.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P6 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) A scrolling dry run gives frame data for each product, or the product is
                   marked unsupported.
  Why            : Smooth scrolling and animation matter to users → measure frame timing with a Windows
                   tool (PresentMon) and long-frame data inside the page → smoothness can be compared, or
                   marked unsupported for a product.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p6.8-smoothness-measurement.ps1
  Result         : NOT READY until P6 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P6" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    Dry run on the scrolling workload produces PresentMon output for each product, or the product is
    recorded as unsupported for that metric.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p6.8' -Title 'Smoothness measurement' -Phase 'phase-p6-benchmark-harness' `
    -Why 'smoothness can be compared, or marked unsupported for a product.'

# TODO(P6): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'A scrolling dry run gives frame data for each product, or the product is marked unsupported' 'Planned check; written when P6 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P6'
