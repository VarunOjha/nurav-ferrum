#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p4.14 (P4 Security): Gate and your review.  DRAFT: not ready until P4.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P4 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) All evidence saved; wiki clean; you approved the P4 exit.
  Why            : Controls are tested → run the gate → you review the threat model and the 'not enforced'
                   list, and approve.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p4.14-gate-review.ps1
  Result         : NOT READY until P4 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P4" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    All evidence files exist; lint clean; owner approves phase-p4-security#exit.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p4.14' -Title 'Gate and your review' -Phase 'phase-p4-security' `
    -Why 'you review the threat model and the ''not enforced'' list, and approve.'

# TODO(P4): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'All evidence saved' 'Planned check; written when P4 starts.'
Add-TodoStep 'Wiki clean' 'Planned check; written when P4 starts.'
Add-TodoStep 'You approved the P4 exit' 'Planned check; written when P4 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P4'
