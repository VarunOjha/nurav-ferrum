#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p7.13 (P7 Smart tab sleeping): Gate and your review.  DRAFT: not ready until P7.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P7 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) All evidence files exist, the wiki check is clean, and you approve the end of
                   P7.
  Why            : All tasks done → the gate script runs every check and saves the evidence → you review
                   and approve; only then does P8 start.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p7.13-gate-review.ps1
  Result         : NOT READY = exit 2 until P7; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P7" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    All evidence files exist; lint clean; owner approves phase-p7-lifecycle#exit.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p7.13' -Title 'Gate and your review' -Phase 'phase-p7-lifecycle' `
    -Why 'you review and approve; only then does P8 start.'

# TODO(P7): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'All evidence files exist, the wiki check is clean, and you approve the end of P7' 'Planned check; written when P7 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P7'
