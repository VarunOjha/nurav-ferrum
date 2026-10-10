#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p4.3 (P4 Security): Check every navigation path.  DRAFT: not ready until P4.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P4 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) A blocked site is denied and logged via direct link, redirect, frame, pop-up
                   and malformed address.
  Why            : Tauri's hook misses unreadable addresses and embedded frames → also hook WebView2's own
                   events and re-check each redirect → no way around the rules by redirect, frame or
                   pop-up.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p4.3-check-every-navigation.ps1
  Result         : NOT READY until P4 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P4" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    Security tests: blocked domain via direct navigation, via 302 redirect from an allowed fixture, via
    iframe, via window.open and via a malformed URL are all denied and logged.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p4.3' -Title 'Check every navigation path' -Phase 'phase-p4-security' `
    -Why 'no way around the rules by redirect, frame or pop-up.'

# TODO(P4): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'A blocked site is denied and logged via direct link, redirect, frame, pop-up and malformed address' 'Planned check; written when P4 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P4'
