#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.8 (P3 Tabs and sessions): Basic downloads.

.DESCRIPTION
  What it checks : (1) the test server's download pages (unit tests: deterministic bytes and file names; the broken
                   download announces 1 MB); (2) the smoke test "downloads": a 300 KB file lands in the download folder
                   with the right size and SHA-256, the shell shows it done, the page stays; the same file again gets a
                   new name and nothing is replaced; a download that breaks off shows as failed (one line, although
                   WebView2 retries it); Clear empties the list.
  Why            : people download files every day → save them in the Downloads folder (or the folder in the settings)
                   under a name that never replaces an existing file, and show progress and the end → you know where
                   each file is and whether it arrived whole.
  What it changes: nothing in git.
  How long       : about 40 seconds after the first build.
  How to run     : pwsh -NoProfile -File scripts/verify/p3.8-basic-downloads.ps1
                   Needs the local development certificate (task p2.1) and ports 8443 and 9339 free.
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p3.8 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1, scripts/lib/Ferrum.SelfTest.ps1). Phase-page verify field:
    Integration test downloads a fixture file and checks size and hash; failure fixture shows the error state.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p3.8' -Title 'Basic downloads' -Phase 'phase-p3-tabs-sessions' `
    -Why 'you know where each file is and whether it arrived whole.'

Invoke-Step 'Test server download pages' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'fixture-server', '--test', 'routes')
    if ($r.Output -notmatch 'downloads_are_deterministic_and_named \.\.\. ok') { Stop-Fail 'The download page test did not pass.' }
    'downloads_are_deterministic_and_named: ok'
}

Invoke-Step 'Smoke test: size and SHA-256, no replaced files, broken download failed, list cleared' {
    $r = Invoke-FerrumSmoke -Spec 'downloads'
    Add-LogText (Get-Tail $r.Output 9)
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '\b5 passed') { Stop-Fail "The smoke test failed:`n$(Get-Tail $r.Output 20)" }
    'downloads: 5 passed (including the new-window download from p3.16)'
}

Complete-Check -SaveEvidence:$SaveEvidence
