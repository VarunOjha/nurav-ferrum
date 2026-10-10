#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p7.14 (P7 Smart tab sleeping): Optional rerun with smart sleeping.  DRAFT: not ready until P7.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P7 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) A sealed raw-data folder with every trial, or a written deviation note that
                   cites your answer.
  Why            : The first campaign tested Ferrum without sleeping → if you pick option (a) in this open
                   question, rerun footprint, page-load, smoothness, energy and reliability with smart
                   sleeping, same rules, kept separate → otherwise the gap is recorded as a known
                   limitation.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p7.14-optional-rerun.ps1
  Result         : NOT READY until P7 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P7" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    raw/bench/<run-id>/ sealed (SEALED file present) with manifest, every trial and checksums; or, if
    Q-208 = option b, a deviation note in ov-research-threats-to-validity citing the owner's answer in
    raw/owner/. No result statements yet.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p7.14' -Title 'Optional rerun with smart sleeping' -Phase 'phase-p7-lifecycle' `
    -Why 'otherwise the gap is recorded as a known limitation.'

# TODO(P7): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'A sealed raw-data folder with every trial, or a written deviation note that cites your answer' 'Planned check; written when P7 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P7'
