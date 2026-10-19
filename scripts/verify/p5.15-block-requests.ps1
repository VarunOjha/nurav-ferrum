#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p5.15 (P5 Measurement): Stop requests to blocked sites.

.DESCRIPTION
  What it checks : (1) the security engine's request check: a request to a blocked site is refused whatever it is
                   for and however its address is written; a more specific allowed entry lets it through; an
                   unreadable address is refused (unit and random-input tests); (2) live, with 127.0.0.1 blocked: a
                   typed address, a link, a redirect, a frame, an image and a fetch to that site each leave the test
                   server's request counter untouched, while an allowed fetch is counted; a control run with the filter
                   switched off (a debug-only test mode) shows the counter does catch a request that gets through;
                   (3) a rough cost trial: a test page loaded 30 times with the filter on and off.
  Why            : A blocked site still received the request → stop it at the network level for every way in → a
                   blocked site really gets nothing (your answer to the question about blocked sites).
  What it changes: nothing. It starts Ferrum four times; it closes by itself (nothing is killed).
  How long       : about 4 minutes (longer the first time, while Rust compiles).
  How to run     : pwsh -NoProfile -File scripts/verify/p5.15-block-requests.ps1   (do not use the PC meanwhile)
  Result         : PASS or FAIL (the line says what).
  Tell Claude    : "p5.15 check passed", or paste the FAIL lines.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    -SaveEvidence also writes wiki/raw/evidence/phase-p5-telemetry/block-requests-cost-p5.15.json.
    Phase-page verify field: Integration test: the fixture server counts no request for a blocked site after typed,
    link, redirect, frame and sub-resource attempts; allowed sites still load; the request filter's cost is measured
    and the raw output saved.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p5.15' -Title 'Stop requests to blocked sites' -Phase 'phase-p5-telemetry' `
    -Why 'a blocked site really gets nothing.'

$cargoBin = Join-Path $env:USERPROFILE '.cargo/bin'
if ((Test-Path -LiteralPath $cargoBin) -and ($env:PATH -notlike "*$cargoBin*")) { $env:PATH = "$cargoBin;$env:PATH" }
$script:Cost = $null

Invoke-Step 'The request check: blocked hosts refused in every spelling, allow override, unreadable addresses refused' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-security', '--test', 'resource_requests')
    foreach ($n in 'requests_to_blocked_hosts_are_refused_and_others_pass', 'unreadable_web_addresses_are_refused',
        'a_blocked_host_is_refused_whatever_follows', 'never_panics') {
        if ($r.Output -notmatch "(?m)^test (\S+::)?$n \.\.\. ok") { Stop-Fail "Test '$n' did not run or did not pass." }
    }
    'four tests passed (two of them on random input)'
}

Invoke-Step 'Live: no request of any kind reaches the blocked site; allowed requests do; the control catches a leak' {
    $r = Invoke-FerrumSmoke -Spec @('block-requests')
    Add-LogText (Get-Tail $r.Output 12)
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '3 passed') { Stop-Fail "The live test failed:`n$(Get-Tail $r.Output 30)" }
    $out = $r.Output -split "`r?`n"
    $line = $out | Where-Object { $_ -match 'BLOCK-REQUESTS ' } | Select-Object -Last 1
    $ctl = $out | Where-Object { $_ -match 'BLOCK-CONTROL ' } | Select-Object -Last 1
    $cost = $out | Where-Object { $_ -match 'BLOCK-COST ' } | Select-Object -Last 1
    if (-not $line -or -not $ctl -or -not $cost) { Stop-Fail 'The live test printed no BLOCK-REQUESTS, BLOCK-CONTROL or BLOCK-COST line.' }
    $d = $line.Substring($line.IndexOf('BLOCK-REQUESTS ') + 15) | ConvertFrom-Json
    $script:Cost = $cost.Substring($cost.IndexOf('BLOCK-COST ') + 11) | ConvertFrom-Json
    $counts = ($d.counts.PSObject.Properties | ForEach-Object { "$($_.Name) $($_.Value)" }) -join ', '
    $rows = foreach ($x in $script:Cost.runs) { 'filter {0}: load {1:0.0} ms median ({2:0.0} to {3:0.0})' -f $x.run, $x.load_ms_median, $x.load_ms_min, $x.load_ms_max }
    "counts after one allowed visit each (count:1 = the blocked attempt never arrived): $counts`n" +
        $ctl.Substring($ctl.IndexOf('BLOCK-CONTROL ') + 14) + "`ncost (rough, debug, on first): " + ($rows -join '; ')
}

if ($SaveEvidence -and $script:Cost) {
    [void](Save-Evidence -Path 'wiki/raw/evidence/phase-p5-telemetry/block-requests-cost-p5.15.json' -Text ($script:Cost | ConvertTo-Json -Depth 6))
}
Complete-Check -SaveEvidence:$SaveEvidence
