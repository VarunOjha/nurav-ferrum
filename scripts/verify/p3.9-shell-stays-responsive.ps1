#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.9 (P3 Tabs and sessions): The toolbar stays responsive while a tab is busy.

.DESCRIPTION
  What it checks : the smoke test "responsive": a tab on site-a.localhost runs a script that never stops (test page
                   /busy); switching to a tab on site-b.localhost and typing an address there each finish within
                   5 seconds; the busy tab can still be closed. The 5 seconds is a requirement of the test, not a
                   measurement: the timings in the output are test log, not performance results (those come from the
                   benchmark phases).
  Why            : one stuck page must not freeze the browser → pages run apart from the trusted toolbar → you can
                   always switch away from, or close, a stuck tab.
  What it changes: nothing in git.
  How long       : about 25 seconds after the first build.
  How to run     : pwsh -NoProfile -File scripts/verify/p3.9-shell-stays-responsive.ps1
                   Needs the local development certificate (task p2.1) and ports 8443 and 9339 free.
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p3.9 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1, scripts/lib/Ferrum.SelfTest.ps1). Phase-page verify field:
    Smoke test: with a busy-loop fixture in tab A, switching to tab B and typing in the address bar completes
    within the test timeout defined in the test (a requirement threshold, not a measurement result); result recorded.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p3.9' -Title 'The toolbar stays responsive while a tab is busy' -Phase 'phase-p3-tabs-sessions' `
    -Why 'you can always switch away from, or close, a stuck tab.'

Invoke-Step 'Smoke test: switch and type within 5 s while a tab spins; the busy tab closes' {
    $r = Invoke-FerrumSmoke -Spec 'responsive'
    $line = ($r.Output -split "`r?`n" | Where-Object { $_ -match 'p3\.9 result:' } | Select-Object -Last 1)
    Add-LogText (Get-Tail $r.Output 6)
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '\b1 passed') { Stop-Fail "The smoke test failed:`n$(Get-Tail $r.Output 20)" }
    "responsive: 1 passed; $($line.Trim()) (test log, not a measurement)"
}

Complete-Check -SaveEvidence:$SaveEvidence
