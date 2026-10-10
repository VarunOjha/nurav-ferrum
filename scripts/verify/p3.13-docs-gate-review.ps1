#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.13 (P3 Tabs and sessions): Docs, gate, your review.  DRAFT: not ready until P3.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P3 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) All evidence saved; wiki clean; you approved the P3 exit.
  Why            : Tabs done → update part pages, known limits and the README, then run the gate → you use
                   Ferrum for a real working session and approve.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p3.13-docs-gate-review.ps1
  Result         : NOT READY until P3 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P3" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    All evidence files exist; lint clean; owner approves phase-p3-tabs-sessions#exit.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p3.13' -Title 'Docs, gate, your review' -Phase 'phase-p3-tabs-sessions' `
    -Why 'you use Ferrum for a real working session and approve.'

# TODO(P3): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'All evidence saved' 'Planned check; written when P3 starts.'
Add-TodoStep 'Wiki clean' 'Planned check; written when P3 starts.'
Add-TodoStep 'You approved the P3 exit' 'Planned check; written when P3 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P3'
