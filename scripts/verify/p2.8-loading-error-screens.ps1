#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p2.8 (P2 First working app): Loading and error screens.  DRAFT: not ready until P2.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P2 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) Slow, 404, 500 and unreachable tests each show the right state.
  Why            : Pages are slow or fail → spinner and error panel drawn by the shell, never by loading
                   the app's own pages into the website view → clear feedback without weakening security.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p2.8-loading-error-screens.ps1
  Result         : NOT READY until P2 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P2" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    Smoke tests with the slow, 404, 500 and unreachable-host fixtures assert the shell shows the right
    state; content WebView URL is never the app's local origin.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p2.8' -Title 'Loading and error screens' -Phase 'phase-p2-minimal-container' `
    -Why 'clear feedback without weakening security.'

# TODO(P2): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Slow, 404, 500 and unreachable tests each show the right state' 'Planned check; written when P2 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P2'
