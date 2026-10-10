#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p7.1 (P7 Smart tab sleeping): Tab state machine.  DRAFT: not ready until P7.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P7 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) Tests cover every allowed and forbidden move, plus random sequences that
                   never break the rules.
  Why            : Each tab must always be in one clear state (active, background, idle, close candidate,
                   closed, restoring) → write the allowed moves as a fixed table with tests → the tab you
                   are using can never be closed by mistake.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p7.1-tab-state-machine.ps1
  Result         : NOT READY until P7 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P7" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    Unit tests for every allowed and every forbidden transition; randomised event-sequence tests assert
    invariants (the active tab is never discarded; RESTORING only leads to ACTIVE or back to DISCARDED on
    failure; an excluded site never leaves BACKGROUND).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p7.1' -Title 'Tab state machine' -Phase 'phase-p7-lifecycle' `
    -Why 'the tab you are using can never be closed by mistake.'

# TODO(P7): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Tests cover every allowed and forbidden move, plus random sequences that never break the rules' 'Planned check; written when P7 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P7'
