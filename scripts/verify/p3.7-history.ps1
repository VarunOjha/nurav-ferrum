#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.7 (P3 Tabs and sessions): History.  DRAFT: not ready until P3.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P3 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) History tests pass; clearing empties the list and the file.
  Why            : You need back/forward per tab and a list of visited pages → kept locally, clearable,
                   never in the repo → useful without leaking.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p3.7-history.ps1
  Result         : NOT READY until P3 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P3" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    Unit tests on the history store; smoke test: clearing history empties the list and the file.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p3.7' -Title 'History' -Phase 'phase-p3-tabs-sessions' `
    -Why 'useful without leaking.'

# TODO(P3): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'History tests pass' 'Planned check; written when P3 starts.'
Add-TodoStep 'Clearing empties the list and the file' 'Planned check; written when P3 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P3'
