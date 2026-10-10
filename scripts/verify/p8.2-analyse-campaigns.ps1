#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p8.2 (P8 Research paper): Analyse the campaigns.  DRAFT: not ready until P8.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P8 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) Every experiment is analysed; a rerun from raw data in a clean setup gives
                   identical output.
  Why            : Raw data alone proves nothing → run the statistics pipeline on all campaign data and
                   mark each prediction supported, not supported or inconclusive → every verdict links to
                   its analysis.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p8.2-analyse-campaigns.ps1
  Result         : NOT READY until P8 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P8" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    Every experiment page has status analyzed and results_ref; every hypothesis verdict links its analysis
    output; analysis rerun from raw data in a clean environment produces byte-identical outputs (hash
    comparison saved).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p8.2' -Title 'Analyse the campaigns' -Phase 'phase-p8-research-paper' `
    -Why 'every verdict links to its analysis.'

# TODO(P8): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Every experiment is analysed' 'Planned check; written when P8 starts.'
Add-TodoStep 'A rerun from raw data in a clean setup gives identical output' 'Planned check; written when P8 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P8'
