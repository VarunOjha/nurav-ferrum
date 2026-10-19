#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p5.5 (P5 Measurement): What the meter itself costs.

.DESCRIPTION
  What it checks : (1) the meter's own CPU time, cycles and memory while it reads 17 processes at 100, 250, 500,
                   1000 and 2000 ms, against a run that does not read at all (optimised build, about two minutes);
                   (2) inside Ferrum with two sites open: how long listing Ferrum's processes takes, and the CPU use
                   per second of Ferrum and its processes at 100 ms and 1000 ms, against a baseline (rough). There are
                   no pass limits: the numbers describe the tool. With -SaveEvidence both results are saved.
  Why            : Measuring uses some CPU and memory itself → measure the meter's own cost at each sampling speed →
                   we know how much it disturbs results (this describes the tool, not Ferrum).
  What it changes: nothing in the repo (the optimised test build goes to target\bench-p5, never target\release).
                   It starts 16 helper programs and Ferrum; all close by themselves (nothing is killed).
  How long       : about 5 minutes (longer the first time, while Rust compiles).
  How to run     : pwsh -NoProfile -File scripts/verify/p5.5-meter-own-cost.ps1   (do not use the PC meanwhile)
  Result         : PASS when both runs finish and report; FAIL otherwise.
  Tell Claude    : "p5.5 check passed", or paste the FAIL lines.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    -SaveEvidence also writes wiki/raw/evidence/phase-p5-telemetry/sampler-cost-p5.5.json.
    Phase-page verify field: Raw outputs saved under raw/evidence/phase-p5-telemetry/; telemetry quality page cites
    them; no comparison claim made.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p5.5' -Title 'What the meter itself costs' -Phase 'phase-p5-telemetry' `
    -Why 'we know how much it disturbs results (this describes the tool, not Ferrum).'

$cargoBin = Join-Path $env:USERPROFILE '.cargo/bin'
if ((Test-Path -LiteralPath $cargoBin) -and ($env:PATH -notlike "*$cargoBin*")) { $env:PATH = "$cargoBin;$env:PATH" }
$script:Result = [ordered]@{}

Invoke-Step 'The meter''s own cost at five intervals, against no reading (17 processes, optimised build)' {
    $r = Assert-Cargo @('test', '--locked', '--release', '--target-dir', 'target/bench-p5', '-p', 'ferrum-telemetry',
        '--test', 'sampler_cost', '--', '--ignored', '--nocapture')
    if ($r.Output -notmatch 'test the_sampler_costs_per_interval \.\.\. ok') { Stop-Fail "The cost run did not pass:`n$(Get-Tail $r.Output 12)" }
    $line = ($r.Output -split "`r?`n" | Where-Object { $_ -match '^SAMPLER-COST ' } | Select-Object -Last 1)
    if (-not $line) { Stop-Fail 'The cost run printed no SAMPLER-COST line.' }
    $data = $line.Substring(13) | ConvertFrom-Json
    $script:Result.standalone = $data
    $rows = foreach ($x in $data.runs) {
        $name = if ($null -eq $x.interval_ms) { 'no reading' } else { "$($x.interval_ms) ms" }
        '{0}: {1} readings, CPU {2:0.###} ms/s, {3:0} cycles per reading, {4:0} us per reading (max {5:0}), memory change {6:0} KiB' -f `
            $name, $x.readings, $x.cpu_ms_per_s, $x.cycles_per_reading, $x.reading_wall_us_mean, $x.reading_wall_us_max, $x.private_commit_change_kib
    }
    Add-LogText ($rows -join "`n")
    "$($data.runs.Count) runs of $($data.run_s) s over $($data.set_size) processes ($($data.build))"
}

Invoke-Step 'Inside Ferrum: listing cost and CPU per second at 100 ms and 1000 ms, against a baseline (rough)' {
    $r = Invoke-FerrumSmoke -Spec @('sampler-cost')
    Add-LogText (Get-Tail $r.Output 10)
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '1 passed') { Stop-Fail "The live run failed:`n$(Get-Tail $r.Output 30)" }
    $line = ($r.Output -split "`r?`n" | Where-Object { $_ -match 'SAMPLER-COST-APP ' } | Select-Object -Last 1)
    if (-not $line) { Stop-Fail 'The live run printed no SAMPLER-COST-APP line.' }
    $data = $line.Substring($line.IndexOf('SAMPLER-COST-APP ') + 17) | ConvertFrom-Json
    $script:Result.in_app = $data
    $rows = foreach ($x in $data.runs) {
        '{0}: {1} readings, listing {2:0.0} ms median (max {3:0.0}), Ferrum process {4:0.00} ms CPU/s, all its processes {5:0.00} ms CPU/s' -f `
            $x.run, $x.readings, $x.list_ms_median, $x.list_ms_max, $x.host_cpu_ms_per_s, $x.tree_cpu_ms_per_s
    }
    Add-LogText ($rows -join "`n")
    ($rows -join '; ')
}

if ($SaveEvidence -and $script:Result.Count -eq 2) {
    [void](Save-Evidence -Path 'wiki/raw/evidence/phase-p5-telemetry/sampler-cost-p5.5.json' -Text ($script:Result | ConvertTo-Json -Depth 6))
}
Complete-Check -SaveEvidence:$SaveEvidence
