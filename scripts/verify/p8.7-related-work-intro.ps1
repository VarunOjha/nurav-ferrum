#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p8.7 (P8 Research paper): Related work, introduction, abstract.  DRAFT: not ready until P8.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P8 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) Each novelty sentence maps to the approved check; you sign off.
  Why            : Claims of novelty must match the approved literature check → write related work from
                   it, then the introduction and abstract last → the paper never overclaims.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p8.7-related-work-intro.ps1
  Result         : NOT READY until P8 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P8" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    Every novelty sentence maps to the approved novelty assessment; owner signs off.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p8.7' -Title 'Related work, introduction, abstract' -Phase 'phase-p8-research-paper' `
    -Why 'the paper never overclaims.'

# TODO(P8): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Each novelty sentence maps to the approved check' 'Planned check; written when P8 starts.'
Add-TodoStep 'You sign off' 'Planned check; written when P8 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P8'
