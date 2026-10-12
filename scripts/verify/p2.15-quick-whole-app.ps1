#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p2.15 (P2 First working app): The whole smoke suite in one command, plus the manual checklist.

.DESCRIPTION
  What it checks : (1) the smoke suite has one command ("npm run smoke" in apps/desktop/tests/smoke) and a test
                   file for each smoke-tested task from p2.7 to p2.13 (p2.12, developer tools, is checked by its own
                   script on the release build, where the test channel does not exist). (2) The whole suite passes
                   (Playwright over the debugging channel, decision 31, against the local test server). (3) The
                   manual checklist for the end-of-phase review exists and lists the checks the phase page asks for.
  Why            : each feature has its own test → one command runs them all, and some things only a person can
                   judge → the first milestone is shown working end to end.
  What it changes: nothing in git.
  How long       : about 1 minute after the first build.
  How to run     : pwsh -NoProfile -File scripts/verify/p2.15-quick-whole-app.ps1
                   Needs the local development certificate (task p2.1) and ports 8443 and 9339 free.
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p2.15 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1, scripts/lib/Ferrum.SelfTest.ps1). Phase-page verify field: smoke
                   suite command exits 0; output saved as evidence.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p2.15' -Title 'Whole smoke suite and manual checklist' -Phase 'phase-p2-minimal-container' `
    -Why 'the first milestone is shown working end to end.'

$specs = [ordered]@{
    'p2.7 back, forward, refresh'   = 'back-forward-refresh.spec.ts'
    'p2.8 loading and error states' = 'loading-errors.spec.ts'
    'p2.9 redirects'                = 'redirects.spec.ts'
    'p2.10 new windows, other apps' = 'new-windows-links.spec.ts'
    'p2.11 cookies kept'            = 'keep-cookies.spec.ts'
    'p2.13 Google sign-in'          = 'google-sign-in.spec.ts'
}

Invoke-Step 'One suite command; a test file for each smoke-tested task' {
    $pkg = Read-RepoText 'apps/desktop/tests/smoke/package.json' | ConvertFrom-Json
    if (-not ($pkg.scripts.PSObject.Properties.Name -contains 'smoke') -or $pkg.scripts.smoke -ne 'playwright test') { Stop-Fail 'package.json has no "smoke": "playwright test" script.' }
    $missing = @($specs.GetEnumerator() | Where-Object { -not (Test-Path -LiteralPath (Get-RepoPath "apps/desktop/tests/smoke/$($_.Value)")) } | ForEach-Object { "$($_.Key) ($($_.Value))" })
    if ($missing.Count) { Stop-Fail "Missing test files: $($missing -join ', ')" }
    "npm run smoke; $($specs.Count) spec files (p2.12 has its own release-build check)"
}

Invoke-Step 'The whole smoke suite passes' {
    $r = Invoke-FerrumSmoke -Spec ''
    Add-LogText (Get-Tail $r.Output 40)
    if ($r.ExitCode -ne 0) { Stop-Fail "The smoke suite failed (exit $($r.ExitCode)):`n$(Get-Tail $r.Output 20)" }
    $m = [regex]::Match($r.Output, '(\d+) passed')
    if (-not $m.Success) { Stop-Fail 'The suite output has no "passed" count.' }
    if ($r.Output -match '\d+ (failed|flaky)') { Stop-Fail "The suite reports failed or flaky tests:`n$(Get-Tail $r.Output 20)" }
    "exit 0; $($m.Groups[1].Value) passed"
}

Invoke-Step 'Manual checklist for the end-of-phase review is written' {
    $t = Read-RepoText 'docs/testing/manual-checklist-p2.md'
    $need = 'five HTTPS sites', 'mailto', 'Close Ferrum and start it again', 'Disconnect the network', 'Alt+Tab'
    $miss = @($need | Where-Object { $t -notmatch [regex]::Escape($_) })
    if ($miss.Count) { Stop-Fail "The checklist does not cover: $($miss -join ', ')" }
    'docs/testing/manual-checklist-p2.md: 5 checks (sites, mailto, sign-in kept, network loss, Alt+Tab)'
}

Complete-Check -SaveEvidence:$SaveEvidence
