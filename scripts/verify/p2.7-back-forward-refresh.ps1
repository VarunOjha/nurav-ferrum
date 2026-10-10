#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p2.7 (P2 First working app): Back, forward, refresh.  DRAFT: not ready until P2.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P2 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) A then B: back shows A, forward shows B, refresh reloads B; buttons match
                   history.
  Why            : Basic browsing → use the method chosen in P1 and grey out buttons that cannot work →
                   behaves like a normal browser.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p2.7-back-forward-refresh.ps1
  Result         : NOT READY = exit 2 until P2; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P2" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Smoke test: A then B then back shows A, forward shows B, refresh reloads B (fixture counts requests);
    button state matches history.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p2.7' -Title 'Back, forward, refresh' -Phase 'phase-p2-minimal-container' `
    -Why 'behaves like a normal browser.'

# TODO(P2): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'A then B: back shows A, forward shows B, refresh reloads B' 'Planned check; written when P2 starts.'
Add-TodoStep 'Buttons match history' 'Planned check; written when P2 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P2'
