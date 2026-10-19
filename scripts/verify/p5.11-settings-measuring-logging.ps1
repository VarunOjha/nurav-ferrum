#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p5.11 (P5 Measurement): Settings for measuring and logging.

.DESCRIPTION
  What it checks : (1) the settings: measuring off by default (your answer), its limits checked (unit test); the
                   settings screen's day limits checked; old measuring files deleted safely (unit tests); (2) live,
                   through the settings screen, with restarts: with the defaults nothing is written; switched on, the
                   next start writes a measuring file that passes the file-format check (run line, process readings,
                   the startup moments, page loads and tab changes) and a network log; switched off again, nothing new
                   is written.
  Why            : You decide what is recorded → add on/off switches for measurement and the network log, a button to
                   open the log folder, and a retention limit → nothing is recorded that you did not choose.
  What it changes: nothing. It starts Ferrum five times; it closes by itself (nothing is killed).
  How long       : about 3 minutes (longer the first time, while Rust compiles).
  How to run     : pwsh -NoProfile -File scripts/verify/p5.11-settings-measuring-logging.ps1   (do not use the PC meanwhile)
  Result         : PASS or FAIL (the line says what).
  Tell Claude    : "p5.11 check passed", or paste the FAIL lines.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    Phase-page verify field: Smoke test toggles each setting and asserts files are or are not written.
    Not automated: the two "open folder" buttons start File Explorer (hand check).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p5.11' -Title 'Settings for measuring and logging' -Phase 'phase-p5-telemetry' `
    -Why 'nothing is recorded that you did not choose.'

$cargoBin = Join-Path $env:USERPROFILE '.cargo/bin'
if ((Test-Path -LiteralPath $cargoBin) -and ($env:PATH -notlike "*$cargoBin*")) { $env:PATH = "$cargoBin;$env:PATH" }

function Assert-Passed($Output, [string[]] $Names) {
    foreach ($n in $Names) {
        if ($Output -notmatch "(?m)^test (\S+::)?$n \.\.\. ok") { Stop-Fail "Test '$n' did not run or did not pass." }
    }
}

Invoke-Step 'Settings: measuring off by default, limits checked; old measuring files deleted safely' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-core', '--test', 'config', 'telemetry_is_off_by_default')
    Assert-Passed $r.Output @('telemetry_is_off_by_default_and_its_limits_are_checked')
    $a = Assert-Cargo @('test', '--locked', '-p', 'ferrum-desktop', 'prune_deletes_only_old_run_files')
    Assert-Passed $a.Output @('prune_deletes_only_old_run_files')
    $w = Assert-Cargo @('test', '--locked', '-p', 'ferrum-telemetry', '--test', 'win_sample', 'the_windows_build')
    Assert-Passed $w.Output @('the_windows_build_reads_as_four_numbers')
    'off by default (your answer), limits refused; only Ferrum''s own old measuring files deleted; the Windows build reads'
}

Invoke-Step 'Live: switches on the settings screen; files written only when switched on' {
    $r = Invoke-FerrumSmoke -Spec @('measuring-settings')
    Add-LogText (Get-Tail $r.Output 10)
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '1 passed') { Stop-Fail "The live test failed:`n$(Get-Tail $r.Output 30)" }
    $line = ($r.Output -split "`r?`n" | Where-Object { $_ -match 'MEASURING-SETTINGS: ' } | Select-Object -Last 1)
    if (-not $line) { Stop-Fail 'The live test printed no MEASURING-SETTINGS line.' }
    $line.Substring($line.IndexOf('MEASURING-SETTINGS: ') + 20)
}

Complete-Check -SaveEvidence:$SaveEvidence
