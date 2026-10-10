#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p5.13 (P5 Measurement): Reading: measurement methods.  DRAFT: not ready until P5.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P5 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) New research notes saved; each headline measurement is marked defined and
                   cites the accuracy test.
  Why            : Our methods must match good practice → read the literature on measurement and browser
                   benchmarking → each headline measurement gets a final, cited definition.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p5.13-reading-measurement-methods.ps1
  Result         : NOT READY until P5 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P5" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    New raw research notes; each headline metric page has status defined and cites p5.4 evidence.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p5.13' -Title 'Reading: measurement methods' -Phase 'phase-p5-telemetry' `
    -Why 'each headline measurement gets a final, cited definition.'

# TODO(P5): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'New research notes saved' 'Planned check; written when P5 starts.'
Add-TodoStep 'Each headline measurement is marked defined and cites the accuracy test' 'Planned check; written when P5 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P5'
