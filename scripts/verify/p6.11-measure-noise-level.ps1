#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p6.11 (P6 Benchmarks): Measure the noise level.  DRAFT: not ready until P6.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P6 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) A/A data saved; noise level reported; each experiment page states its trial
                   count and why.
  Why            : Some variation is just noise → run one product against itself (an A/A test) plus short
                   pilots → we know the smallest real difference we can detect and set the trial count for
                   each experiment.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p6.11-measure-noise-level.ps1
  Result         : NOT READY = exit 2 until P6; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P6" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    A/A raw data in raw/bench/<run-id>/; analysis report shows the noise floor; each experiment page has
    trials.target set with a written justification.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p6.11' -Title 'Measure the noise level' -Phase 'phase-p6-benchmark-harness' `
    -Why 'we know the smallest real difference we can detect and set the trial count for each experiment.'

# TODO(P6): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'A/A data saved' 'Planned check; written when P6 starts.'
Add-TodoStep 'Noise level reported' 'Planned check; written when P6 starts.'
Add-TodoStep 'Each experiment page states its trial count and why' 'Planned check; written when P6 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P6'
