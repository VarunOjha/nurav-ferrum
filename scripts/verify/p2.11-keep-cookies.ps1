#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p2.11 (P2 First working app): Keep cookies across restarts.  DRAFT: not ready until P2.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P2 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) A test sets a cookie, restarts the app, and the cookie comes back.
  Why            : Logins should survive a restart → keep site data in a fixed local folder → you stay
                   signed in.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p2.11-keep-cookies.ps1
  Result         : NOT READY until P2 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P2" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    Integration test: fixture sets a persistent cookie, app restarts, fixture echoes the cookie back.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p2.11' -Title 'Keep cookies across restarts' -Phase 'phase-p2-minimal-container' `
    -Why 'you stay signed in.'

# TODO(P2): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'A test sets a cookie, restarts the app, and the cookie comes back' 'Planned check; written when P2 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P2'
