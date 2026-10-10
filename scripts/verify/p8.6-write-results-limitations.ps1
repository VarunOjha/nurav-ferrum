#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p8.6 (P8 Research paper): Write results and limitations.  DRAFT: not ready until P8.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P8 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) Every experiment cited in results is analysed; the limits cover every open
                   risk and unsupported measurement.
  Why            : Results must come only from finished analysis → after it, write results, security and
                   usability trade-offs, and the limits (energy, process counting, debugging-channel
                   effects, one PC) → no early or unsupported claims.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p8.6-write-results-limitations.ps1
  Result         : NOT READY until P8 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P8" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    Gate check: every experiment cited in Results has status analyzed; Threats section covers each open
    risk and each unsupported metric.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p8.6' -Title 'Write results and limitations' -Phase 'phase-p8-research-paper' `
    -Why 'no early or unsupported claims.'

# TODO(P8): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Every experiment cited in results is analysed' 'Planned check; written when P8 starts.'
Add-TodoStep 'The limits cover every open risk and unsupported measurement' 'Planned check; written when P8 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P8'
