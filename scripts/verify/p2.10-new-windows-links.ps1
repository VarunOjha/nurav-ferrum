#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p2.10 (P2 First working app): New windows and links to other apps.

.DESCRIPTION
  What it checks : the smoke test "new-windows-links" (Playwright over the debugging channel, decision 31) drives the
                   real app on the local test server's link pages. With the default settings, target=_blank links,
                   window.open and a script-only pop-up all load in the same view and no second window appears.
                   A mailto link and a custom-scheme link show the shell's confirmation bar. Cancel launches nothing;
                   Open launches exactly that link, once, and a repeated confirmation is refused. A typed mailto
                   address asks too. With new_window = "system-browser", a target=_blank click goes to the system
                   browser and the page stays. The launcher is replaced by a log file in these tests (debug builds
                   only): nothing really opens.
  Why            : links can open new windows or other apps such as mail → Ferrum follows your setting and asks
                   before anything leaves it → nothing launches without your consent.
  What it changes: nothing in git.
  How long       : about 40 seconds after the first build.
  How to run     : pwsh -NoProfile -File scripts/verify/p2.10-new-windows-links.ps1
                   Needs the local development certificate (task p2.1) and ports 8443 and 9339 free.
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p2.10 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1, scripts/lib/Ferrum.SelfTest.ps1). Phase-page verify field: smoke
                   tests: _blank fixture follows the configured behaviour; scheme fixture shows the confirmation and
                   does not launch without consent (launcher mocked in test).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p2.10' -Title 'New windows and links to other apps' -Phase 'phase-p2-minimal-container' `
    -Why 'nothing launches without your consent.'

Invoke-Step 'Smoke test: new windows follow the setting; links to other apps ask first and launch only on Open' {
    $r = Invoke-FerrumSmoke -Spec 'new-windows-links'
    Add-LogText (Get-Tail $r.Output 16)
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '7 passed') { Stop-Fail "The smoke test failed:`n$(Get-Tail $r.Output 20)" }
    'new-windows-links: 7 passed'
}

Complete-Check -SaveEvidence:$SaveEvidence
