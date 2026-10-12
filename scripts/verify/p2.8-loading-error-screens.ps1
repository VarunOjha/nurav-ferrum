#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p2.8 (P2 First working app): Loading and error states.

.DESCRIPTION
  What it checks : the smoke test "loading-errors" (Playwright over the debugging channel, decision 31) drives the
                   real app against the local test server: a slow page shows the loading state (progress bar, the
                   reload button turns into Stop) and then "loaded"; HTTP 404 and 500 pages are shown with a
                   toolbar status; an unreachable host shows the shell's own error panel (the website view is hidden,
                   no lock icon), and the app recovers on the next address; the website view never showed the app's
                   own local address.
  Why            : pages can be slow, missing or unreachable → a clear loading state and an error panel drawn by
                   the shell → you always know what is happening, and no local app page ever loads in the website view.
  What it changes: nothing in git. With -SaveEvidence a picture of the error panel is saved as evidence.
  How long       : about 30 seconds after the first build.
  How to run     : pwsh -NoProfile -File scripts/verify/p2.8-loading-errors.ps1
                   Needs the local development certificate (task p2.1) and ports 8443 and 9339 free.
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p2.8 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1, scripts/lib/Ferrum.SelfTest.ps1). Phase-page verify field: smoke
                   tests with the slow, 404, 500 and unreachable-host fixtures assert the shell shows the right state;
                   content WebView URL is never the app's local origin.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p2.8' -Title 'Loading and error states' -Phase 'phase-p2-minimal-container' `
    -Why 'you always know what is happening.'

Invoke-Step 'Smoke test: slow, 404, 500, unreachable host; never the app origin in the website view' {
    $r = Invoke-FerrumSmoke -Spec 'loading-errors'
    Add-LogText (Get-Tail $r.Output 14)
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '5 passed') { Stop-Fail "The smoke test failed:`n$(Get-Tail $r.Output 20)" }
    if ($SaveEvidence) {
        $pic = Get-ChildItem -LiteralPath (Get-RepoPath 'apps/desktop/tests/smoke/.data') -Recurse -Filter 'error-panel.png' |
            Sort-Object LastWriteTime -Descending | Select-Object -First 1
        $dest = Get-RepoPath 'wiki/raw/evidence/phase-p2-minimal-container/p2.8-error-panel.png'
        if ($pic -and -not (Test-Path -LiteralPath $dest)) { Copy-Item -LiteralPath $pic.FullName -Destination $dest }
    }
    'loading-errors: 5 passed'
}

Complete-Check -SaveEvidence:$SaveEvidence
