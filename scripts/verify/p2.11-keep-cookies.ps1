#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p2.11 (P2 First working app): Keep cookies across a restart.

.DESCRIPTION
  What it checks : the smoke test "keep-cookies" (Playwright over the debugging channel, decision 31) starts Ferrum
                   with a fixed data folder and opens two local test pages: one sets a cookie that lasts a day, one
                   sets a session cookie. It checks that both are sent back, then closes Ferrum normally. The cookie
                   store is inside Ferrum's own profile in that folder. Ferrum is started again on the same folder:
                   the one-day cookie is sent back, the session cookie is gone (as in a normal browser).
  Why            : sites remember you with cookies → Ferrum keeps them in its own data folder → you stay signed
                   in after closing and reopening Ferrum.
  What it changes: nothing in git.
  How long       : about 30 seconds after the first build.
  How to run     : pwsh -NoProfile -File scripts/verify/p2.11-keep-cookies.ps1
                   Needs the local development certificate (task p2.1) and ports 8443 and 9339 free.
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p2.11 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1, scripts/lib/Ferrum.SelfTest.ps1). Phase-page verify field:
                   integration test: fixture sets a persistent cookie, app restarts, fixture echoes the cookie back.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p2.11' -Title 'Keep cookies across a restart' -Phase 'phase-p2-minimal-container' `
    -Why 'you stay signed in after closing and reopening Ferrum.'

Invoke-Step 'Smoke test: a one-day cookie survives a restart on the same data folder; a session cookie does not' {
    $r = Invoke-FerrumSmoke -Spec 'keep-cookies'
    Add-LogText (Get-Tail $r.Output 10)
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '1 passed') { Stop-Fail "The smoke test failed:`n$(Get-Tail $r.Output 20)" }
    'keep-cookies: 1 passed'
}

Complete-Check -SaveEvidence:$SaveEvidence
