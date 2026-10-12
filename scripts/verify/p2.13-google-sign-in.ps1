#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p2.13 (P2 First working app): Google sign-in opens in your normal browser.

.DESCRIPTION
  What it checks : (1) the unit tests of the sign-in address checker in ferrum-core: Google's sign-in address
                   (recorded in wiki/raw/research/google-oauth-endpoint.md) is recognised, look-alikes are not, and
                   the test-only address counts only when given. (2) The smoke test "google-sign-in" (Playwright over
                   the debugging channel, decision 31). A sign-in link on the local test site, a typed sign-in
                   address and the real Google address do not load inside Ferrum. Instead the bar says "Google
                   sign-in must open in your normal browser" with "Open in browser". Dismiss opens nothing; the button
                   opens exactly that address (the launcher is replaced by a log file in tests, so nothing really
                   opens). (3) Ferrum's code contains no user-agent change.
  Why            : Google does not allow sign-in inside embedded browsers → Ferrum recognises it and offers your
                   normal browser, without tricks → sign-in stays honest and possible (your answer to question 109).
  What it changes: nothing in git.
  How long       : about 40 seconds after the first build.
  How to run     : pwsh -NoProfile -File scripts/verify/p2.13-google-sign-in.ps1
                   Needs the local development certificate (task p2.1) and ports 8443 and 9339 free.
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p2.13 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1, scripts/lib/Ferrum.SelfTest.ps1). Phase-page verify field: unit test
                   on the URL classifier with recorded URL patterns (no live Google login); smoke test with a fixture
                   link pointing at a test-only pattern shows the banner.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p2.13' -Title 'Google sign-in opens in your normal browser' -Phase 'phase-p2-minimal-container' `
    -Why 'sign-in stays honest and possible.'

Invoke-Step 'Unit tests of the sign-in address checker (recorded Google addresses, look-alikes, test pattern)' {
    $out = Assert-Cargo @('test', '--locked', '-p', 'ferrum-core', '--test', 'oauth')
    Add-LogText (Get-Tail $out 6)
    if ($out -notmatch 'test result: ok\. 3 passed') { Stop-Fail "Expected 3 passing test groups:`n$(Get-Tail $out 10)" }
    'ferrum-core oauth tests: 3 passed'
}

Invoke-Step 'Smoke test: sign-in links show the bar and never load inside Ferrum; only the click opens them' {
    $r = Invoke-FerrumSmoke -Spec 'google-sign-in'
    Add-LogText (Get-Tail $r.Output 10)
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '4 passed') { Stop-Fail "The smoke test failed:`n$(Get-Tail $r.Output 20)" }
    'google-sign-in: 4 passed'
}

Invoke-Step 'No user-agent change anywhere in Ferrum''s code' {
    $hits = @(Get-ChildItem -LiteralPath (Get-RepoPath 'crates'), (Get-RepoPath 'apps/desktop/src-tauri/src'), (Get-RepoPath 'apps/desktop/src') -Recurse -File -Include '*.rs', '*.ts' |
        Select-String -Pattern 'SetUserAgent|user_agent\(|userAgent\s*=|--user-agent' |
        ForEach-Object { "$($_.Path | Resolve-Path -Relative):$($_.LineNumber)" })
    if ($hits.Count) { Stop-Fail "User-agent code found: $($hits -join ', ')" }
    'no SetUserAgent / user_agent( / --user-agent in crates or apps/desktop'
}

Complete-Check -SaveEvidence:$SaveEvidence
