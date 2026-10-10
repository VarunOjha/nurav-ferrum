#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p2.13 (P2 First working app): Google sign-in: offer the normal browser.  DRAFT: not ready until P2.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P2 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) Test on recorded addresses; a test link shows the banner. No live Google
                   login.
  Why            : Google may refuse sign-in inside embedded views → detect its sign-in page and offer the
                   system browser, never disguise the app → we respect Google's rules.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p2.13-google-sign-in.ps1
  Result         : NOT READY = exit 2 until P2; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P2" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Unit test on the URL classifier with recorded URL patterns (no live Google login); smoke test with a
    fixture link pointing at a test-only pattern shows the banner.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p2.13' -Title 'Google sign-in: offer the normal browser' -Phase 'phase-p2-minimal-container' `
    -Why 'we respect Google''s rules.'

# TODO(P2): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Test on recorded addresses' 'Planned check; written when P2 starts.'
Add-TodoStep 'A test link shows the banner' 'Planned check; written when P2 starts.'
Add-TodoStep 'No live Google login' 'Planned check; written when P2 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P2'
