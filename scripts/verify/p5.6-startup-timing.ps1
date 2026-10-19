#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p5.6 (P5 Measurement): Startup timing.

.DESCRIPTION
  What it checks : (1) the rules that turn the five startup moments into records: complete, in order, counted from
                   the moment Ferrum's process was created (unit tests); (2) live: Ferrum starts with a test page as
                   its start page, and all five moments are present and in order: process created, window visible,
                   the shell's first paint, the tab's first content drawn, the tab's largest content drawn. The paint
                   times are read by Ferrum from the pages through the browser engine's developer interface; page
                   script never sends them.
  Why            : "How fast does it start" needs fixed, standard moments → record process start, window shown, first
                   content and main content → startup can be compared fairly later (owner's choice: no "time to
                   interactive").
  What it changes: nothing. It starts Ferrum, which closes by itself (nothing is killed).
  How long       : about 2 minutes (longer the first time, while Rust compiles).
  How to run     : pwsh -NoProfile -File scripts/verify/p5.6-startup-timing.ps1   (do not use the PC meanwhile)
  Result         : PASS or FAIL (the line says what).
  Tell Claude    : "p5.6 check passed", or paste the FAIL lines.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    Phase-page verify field: Integration test on a fixture page asserts every boundary is present and ordered
    (creation before visible before FCP before LCP); boundary definitions match the metric pages.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p5.6' -Title 'Startup timing' -Phase 'phase-p5-telemetry' `
    -Why 'startup can be compared fairly later.'

$cargoBin = Join-Path $env:USERPROFILE '.cargo/bin'
if ((Test-Path -LiteralPath $cargoBin) -and ($env:PATH -notlike "*$cargoBin*")) { $env:PATH = "$cargoBin;$env:PATH" }

Invoke-Step 'The startup records: complete, in order, counted from process creation' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-telemetry', 'startup::')
    foreach ($n in 'a_complete_chain_becomes_ordered_marks_on_the_run_clock', 'a_chain_out_of_order_or_incomplete_is_refused',
        'filetime_converts_to_unix_milliseconds') {
        if ($r.Output -notmatch "(?m)^test (\S+::)?$n \.\.\. ok") { Stop-Fail "Test '$n' did not run or did not pass." }
    }
    'three unit tests passed'
}

Invoke-Step 'The metric pages define the in-app boundaries' {
    foreach ($m in 'metric-startup-window-visible', 'metric-startup-fcp', 'metric-startup-lcp') {
        $t = Read-RepoText "wiki/research/metrics/$m.md"
        if ($t -notmatch '## In-app chain \(p5\.6\)') { Stop-Fail "$m has no in-app chain section." }
    }
    'window visible, first contentful paint and largest contentful paint pages each describe the in-app boundary'
}

Invoke-Step 'Live: all five startup moments present and in order (test page as the start page)' {
    $r = Invoke-FerrumSmoke -Spec @('startup-timing')
    $line = ($r.Output -split "`r?`n" | Where-Object { $_ -match 'STARTUP: ' } | Select-Object -Last 1)
    Add-LogText (Get-Tail $r.Output 12)
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '1 passed') { Stop-Fail "The live test failed:`n$(Get-Tail $r.Output 30)" }
    if (-not $line) { Stop-Fail 'The live test printed no STARTUP line.' }
    $line.Substring($line.IndexOf('STARTUP: ') + 9)
}

Complete-Check -SaveEvidence:$SaveEvidence
