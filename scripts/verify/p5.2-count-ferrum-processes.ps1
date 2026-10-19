#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p5.2 (P5 Measurement): Count exactly Ferrum's processes.

.DESCRIPTION
  What it checks : (1) the counting rule: Ferrum's own process plus what the browser engine lists for Ferrum's
                   environments, each process once, bad lists refused (unit tests); (2) no part of the counting code
                   matches processes by program name; (3) live: with another app that uses the same browser engine
                   running beside Ferrum (the S1 test app from P1), Ferrum's set holds every engine process below
                   Ferrum and none of the other app's, checked against a Windows process list.
  Why            : Other apps on the PC use the same browser engine (same program name) → count only the processes
                   the engine reports for Ferrum → memory and CPU numbers are not inflated by other apps.
  What it changes: nothing. It starts Ferrum and the S1 test app; both close by themselves (nothing is killed).
  How long       : about 2 minutes (longer the first time, while Rust compiles).
  How to run     : pwsh -NoProfile -File scripts/verify/p5.2-count-ferrum-processes.ps1   (do not use the PC meanwhile)
  Result         : PASS or FAIL (the line says what).
  Tell Claude    : "p5.2 check passed", or paste the FAIL lines.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    Phase-page verify field: Integration test runs Ferrum alongside another WebView2 host (the S1 spike app) and
    asserts the other host's PIDs are excluded and every Ferrum WebView2 PID is included (cross-checked with a process
    snapshot).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p5.2' -Title "Count exactly Ferrum's processes" -Phase 'phase-p5-telemetry' `
    -Why 'memory and CPU numbers are not inflated by other apps.'

$cargoBin = Join-Path $env:USERPROFILE '.cargo/bin'
if ((Test-Path -LiteralPath $cargoBin) -and ($env:PATH -notlike "*$cargoBin*")) { $env:PATH = "$cargoBin;$env:PATH" }

Invoke-Step 'The counting rule: own process plus the engine lists, each once, bad lists refused' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-telemetry', 'attribution::')
    foreach ($n in 'host_and_every_environment_process_once', 'a_process_seen_twice_counts_once',
        'bad_input_is_refused_not_guessed', 'no_environment_yet_means_only_ferrum', 'kind_names_map_to_export_kinds') {
        if ($r.Output -notmatch "(?m)^test (\S+::)?$n \.\.\. ok") { Stop-Fail "Test '$n' did not run or did not pass." }
    }
    'five unit tests passed'
}

Invoke-Step 'No counting code matches processes by program name' {
    $files = @('crates/telemetry/src/attribution.rs')
    $content = Read-RepoText 'apps/desktop/src-tauri/src/content.rs'
    $m = [regex]::Match($content, '(?s)async fn process_inventories.*?\n(?:pub(?:\(crate\))? )?fn set_of.*?\n}\n')
    if (-not $m.Success) { Stop-Fail 'The process-set code (process_inventories, set_of) was not found in content.rs.' }
    # Comments may name the program (to explain the rule); only code counts.
    $texts = @(@($files | ForEach-Object { Read-RepoText $_ }) + $m.Value | ForEach-Object {
        ($_ -split "`r?`n" | Where-Object { $_ -notmatch '^\s*//' }) -join "`n"
    })
    foreach ($t in $texts) {
        if ($t -match '(?i)msedgewebview2|\.exe"|ProcessName|CreateToolhelp32Snapshot|Process32') {
            Stop-Fail "The counting code mentions a program name or a name-based process list: '$($Matches[0])'."
        }
    }
    'attribution.rs and the app''s process-set code use only the engine''s own lists'
}

Invoke-Step 'Live: another engine app beside Ferrum; Ferrum''s set matches the Windows process list' {
    $s1 = 'spikes/s1-multiwebview/src-tauri'
    if (-not (Test-Path -LiteralPath (Get-RepoPath "$s1/target/debug/ferrum-spike-s1.exe"))) {
        [void](Assert-Cargo @('build', '--locked') -Folder $s1)
    }
    $r = Invoke-FerrumSmoke -Spec @('process-set')
    $line = ($r.Output -split "`r?`n" | Where-Object { $_ -match 'PROCESS-SET ' } | Select-Object -Last 1)
    Add-LogText (Get-Tail $r.Output 12)
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '1 passed') { Stop-Fail "The live test failed:`n$(Get-Tail $r.Output 30)" }
    if (-not $line -or $line -notmatch 'in set 0') { Stop-Fail "The live test printed no clean PROCESS-SET line." }
    $line.Substring($line.IndexOf('PROCESS-SET ') + 12)
}

Complete-Check -SaveEvidence:$SaveEvidence
