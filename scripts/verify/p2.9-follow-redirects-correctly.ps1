#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p2.9 (P2 First working app): Follow redirects correctly.

.DESCRIPTION
  What it checks : the smoke test "redirects" (Playwright over the debugging channel, decision 31) drives the real
                   app through every redirect page of the local test server (301, 302, 303, 307, 308 and a chain):
                   each ends on the final page with its address in the address bar; the redirect loop ends in the
                   shell's error state (a "redirect loop" message), and the app recovers on the next address.
  Why            : sites often forward you to another address → Ferrum shows where you really ended up and stops
                   endless loops → the address bar never lies.
  What it changes: nothing in git.
  How long       : about 30 seconds after the first build.
  How to run     : pwsh -NoProfile -File scripts/verify/p2.9-follow-redirects-correctly.ps1
                   Needs the local development certificate (task p2.1) and ports 8443 and 9339 free.
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p2.9 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1, scripts/lib/Ferrum.SelfTest.ps1). Phase-page verify field: smoke
                   tests for each redirect fixture assert the final URL in the address bar; loop fixture ends in the
                   error state.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p2.9' -Title 'Follow redirects correctly' -Phase 'phase-p2-minimal-container' `
    -Why 'the address bar never lies.'

Invoke-Step 'Smoke test: six redirect kinds end on the final address; the loop ends in the error state' {
    $r = Invoke-FerrumSmoke -Spec 'redirects'
    Add-LogText (Get-Tail $r.Output 14)
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '7 passed') { Stop-Fail "The smoke test failed:`n$(Get-Tail $r.Output 20)" }
    'redirects: 7 passed'
}

Complete-Check -SaveEvidence:$SaveEvidence
