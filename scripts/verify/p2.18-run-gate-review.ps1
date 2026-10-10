#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p2.18 (P2 First working app): Run the gate; your review.  DRAFT: not ready until P2.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P2 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) All evidence saved; wiki clean; you approved the P2 exit.
  Why            : All tasks done → run every check and save the output → you try the release build and
                   approve the first milestone.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p2.18-run-gate-review.ps1
  Result         : NOT READY = exit 2 until P2; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P2" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    All evidence files exist; lint clean; owner approves phase-p2-minimal-container#exit.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p2.18' -Title 'Run the gate; your review' -Phase 'phase-p2-minimal-container' `
    -Why 'you try the release build and approve the first milestone.'

# TODO(P2): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'All evidence saved' 'Planned check; written when P2 starts.'
Add-TodoStep 'Wiki clean' 'Planned check; written when P2 starts.'
Add-TodoStep 'You approved the P2 exit' 'Planned check; written when P2 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P2'
