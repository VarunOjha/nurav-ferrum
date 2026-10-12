#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p2.1 (P2 First working app): Build local test pages.

.DESCRIPTION
  What it checks : the local test-page server (tests/fixtures/server, package fixture-server) passes its own
                   tests: every page answers with its documented status code, a real HTTPS request works with
                   the local development certificate authority, and that authority cannot vouch for any other
                   host name. Then, that the saved real-world probe (Windows curl over HTTPS against the running
                   server) shows every documented status code.
  Why            : Real websites change → a local server with fixed pages (redirects, pop-ups, cookies,
                   slow and error pages) → navigation tests give the same answer every run.
  What it changes: nothing in git. Test builds go to the ignored target/ folder; the TLS test makes a
                   throw-away certificate authority inside target/.
  How long       : about 10 seconds (the first build can take a few minutes).
  How to run     : pwsh -NoProfile -File scripts/verify/p2.1-local-test-pages.ps1
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p2.1 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). Phase-page verify field: the fixture server is a Rust crate at
                   tests/fixtures/server (axum, exact versions pinned in its Cargo.toml); 'cargo test --locked -p
                   fixture-server' passes; each fixture URL returns the documented status code (curl -sI output
                   saved in wiki/raw/evidence/phase-p2-minimal-container/p2.1-fixture-curl.txt).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p2.1' -Title 'Build local test pages' -Phase 'phase-p2-minimal-container' `
    -Why 'navigation tests give the same answer every run.'

# The newest saved probe (raw files are never overwritten; a later probe is a new file, e.g. after test pages were added).
$probe = 'wiki/raw/evidence/phase-p2-minimal-container/' + (Get-ChildItem -LiteralPath (Get-RepoPath 'wiki/raw/evidence/phase-p2-minimal-container') -Filter 'p2.1-fixture-curl*.txt' |
        Sort-Object { if ($_.BaseName -match '-(\d+)$') { [int]$Matches[1] } else { 1 } } | Select-Object -Last 1).Name

Invoke-Step 'Server tests pass (routes, HTTPS, name limit of the local certificate authority)' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'fixture-server')
    $passed = ([regex]::Matches($r.Output, 'test result: ok\. (\d+) passed') | ForEach-Object { [int]$_.Groups[1].Value } | Measure-Object -Sum).Sum
    if ($r.Output -notmatch 'the_dev_ca_cannot_vouch_for_other_hosts \.\.\. ok') { Stop-Fail 'The name-limit test did not run or did not pass.' }
    "cargo test -p fixture-server: $passed tests passed"
}

Invoke-Step 'Each test page returned its documented status over real HTTPS' {
    $t = Read-RepoText $probe
    $routes = Invoke-Native -FilePath 'cargo' -ArgumentList @('run', '-q', '--locked', '-p', 'fixture-server', '--', 'routes')
    if ($routes.ExitCode -ne 0) { Stop-Fail "fixture-server routes failed: $(Get-Tail $routes.Output 3)" }
    $bad = @(foreach ($line in ($routes.Output -split "`r?`n" | Where-Object { $_ -match '^\d{3}\t' })) {
        $code, $path = ($line -split "`t")[0, 1]
        # Match on the path without its query (the probe may use another delay value for /slow).
        $base = ($path -split '\?')[0]
        $block = [regex]::Escape("https://localhost:8443$base") + '(\?\S*)?\s*\n(HTTP/1\.1 (\d{3}))'
        $m = [regex]::Match($t, $block)
        if (-not $m.Success) { "$path (no answer saved)" } elseif ($m.Groups[3].Value -ne $code) { "$path (got $($m.Groups[3].Value), want $code)" }
    })
    if ($bad.Count) { Stop-Fail ("Not as documented: " + ($bad -join '; ')) }
    'every documented route matched in the saved probe'
}

Complete-Check -SaveEvidence:$SaveEvidence
