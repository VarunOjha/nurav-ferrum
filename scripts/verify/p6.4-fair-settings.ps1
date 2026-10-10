#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p6.4 (P6 Benchmarks): Fair settings for each product.  DRAFT: not ready until P6.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P6 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) Every settings file passes a format check; a diff report shows only the
                   documented differences.
  Why            : Chrome and Edge have built-in resource savers → record every relevant setting per
                   product in versioned files, never switching their savers off just to help Ferrum → the
                   comparison is fair and anyone can check it.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p6.4-fair-settings.ps1
  Result         : NOT READY until P6 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P6" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    Schema validation test of every configuration file; a config diff report shows the only differences
    between products are the documented ones.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p6.4' -Title 'Fair settings for each product' -Phase 'phase-p6-benchmark-harness' `
    -Why 'the comparison is fair and anyone can check it.'

# TODO(P6): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Every settings file passes a format check' 'Planned check; written when P6 starts.'
Add-TodoStep 'A diff report shows only the documented differences' 'Planned check; written when P6 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P6'
