#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p6.10 (P6 Benchmarks): Statistics pipeline.  DRAFT: not ready until P6.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P6 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) Tests on made-up data with known answers pass; two runs give identical
                   output.
  Why            : Numbers need honest statistics → a Python pipeline computes averages, spread,
                   confidence ranges, effect sizes and corrections for many comparisons, plus plots → the
                   analysis is repeatable to the byte.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p6.10-statistics-pipeline.ps1
  Result         : NOT READY = exit 2 until P6; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P6" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    pytest suite passes on synthetic datasets with known differences (clearly labelled synthetic, never
    reported); rerunning analysis twice produces byte-identical outputs.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p6.10' -Title 'Statistics pipeline' -Phase 'phase-p6-benchmark-harness' `
    -Why 'the analysis is repeatable to the byte.'

# TODO(P6): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Tests on made-up data with known answers pass' 'Planned check; written when P6 starts.'
Add-TodoStep 'Two runs give identical output' 'Planned check; written when P6 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P6'
