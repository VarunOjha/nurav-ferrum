#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p2.7 (P2 First working app): Back, forward, refresh.

.DESCRIPTION
  What it checks : the smoke test "back-forward-refresh" (Playwright over the debugging channel, decision 31) drives
                   the real app: page A then page B, back shows A, forward shows B, refresh loads B again (the local
                   test server counts the requests), and the back and forward buttons are greyed out exactly when
                   they cannot work (decision 30: they follow the browser's own history).
  Why            : basic browsing → the browser's own history calls and grey buttons when they cannot work → it
                   behaves like a normal browser.
  What it changes: nothing in git. Test data goes to apps/desktop/tests/smoke/.data (ignored). The test server
                   and the app start and stop by themselves.
  How long       : about 30 seconds after the first build.
  How to run     : pwsh -NoProfile -File scripts/verify/p2.7-back-forward-refresh.ps1
                   Needs the local development certificate (task p2.1) and ports 8443 and 9339 free.
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p2.7 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1, scripts/lib/Ferrum.SelfTest.ps1). Phase-page verify field: smoke
                   test: A then B then back shows A, forward shows B, refresh reloads B (fixture counts requests);
                   button state matches history.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p2.7' -Title 'Back, forward, refresh' -Phase 'phase-p2-minimal-container' `
    -Why 'browsing works like a normal browser.'

Invoke-Step 'Smoke test: A, B, back, forward, refresh; buttons follow the history' {
    $r = Invoke-FerrumSmoke -Spec 'back-forward-refresh'
    Add-LogText (Get-Tail $r.Output 12)
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '1 passed') { Stop-Fail "The smoke test failed:`n$(Get-Tail $r.Output 20)" }
    'back-forward-refresh: 1 passed'
}

Complete-Check -SaveEvidence:$SaveEvidence
