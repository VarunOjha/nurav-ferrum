#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.5 (P3 Tabs and sessions): Restore tabs after restart or crash.  DRAFT: not ready until P3.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P3 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) Normal exit, forced kill and unreachable-site restores all behave.
  Why            : Crashes happen → save the tab list regularly and on exit, safely → after a forced kill
                   you get your tabs back.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p3.5-restore-tabs.ps1
  Result         : NOT READY until P3 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P3" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    Integration tests: normal exit then restart restores tabs; forced process kill then restart restores
    the last persisted state; restore of a tab whose site is now unreachable shows the error state, not a
    crash.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p3.5' -Title 'Restore tabs after restart or crash' -Phase 'phase-p3-tabs-sessions' `
    -Why 'after a forced kill you get your tabs back.'

# TODO(P3): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Normal exit, forced kill and unreachable-site restores all behave' 'Planned check; written when P3 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P3'
