#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.1 (P3 Tabs and sessions): Tab rules as plain code.  DRAFT: not ready until P3.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P3 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) Unit and random-sequence tests keep every rule.
  Why            : Tab logic has many edge cases → write it without the window and test random sequences
                   of actions → exactly one active tab, ids never reused.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p3.1-tab-rules.ps1
  Result         : NOT READY = exit 2 until P3; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P3" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Unit tests plus randomised operation-sequence tests assert invariants: exactly one active tab when at
    least one exists; ids never reused; closing the active tab activates a neighbour.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p3.1' -Title 'Tab rules as plain code' -Phase 'phase-p3-tabs-sessions' `
    -Why 'exactly one active tab, ids never reused.'

# TODO(P3): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Unit and random-sequence tests keep every rule' 'Planned check; written when P3 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P3'
