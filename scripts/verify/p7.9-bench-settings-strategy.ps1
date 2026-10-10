#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p7.9 (P7 Smart tab sleeping): Bench settings for each strategy.  DRAFT: not ready until P7.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P7 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) Settings files pass the format check; the diff shows only the strategy switch
                   differs.
  Why            : The test bench needs a setup per strategy → add one settings file for each Ferrum
                   strategy → the only difference between Ferrum runs is the strategy switch.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p7.9-bench-settings-strategy.ps1
  Result         : NOT READY until P7 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P7" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    Configuration schema validation passes; config diff shows only the lifecycle flag differs between
    Ferrum configurations.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p7.9' -Title 'Bench settings for each strategy' -Phase 'phase-p7-lifecycle' `
    -Why 'the only difference between Ferrum runs is the strategy switch.'

# TODO(P7): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Settings files pass the format check' 'Planned check; written when P7 starts.'
Add-TodoStep 'The diff shows only the strategy switch differs' 'Planned check; written when P7 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P7'
