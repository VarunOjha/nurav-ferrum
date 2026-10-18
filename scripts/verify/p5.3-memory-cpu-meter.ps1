#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p5.3 (P5 Measurement): Memory and CPU meter.

.DESCRIPTION
  What it checks : (1) the adding-up rules (unit tests): the total is the sum of private memory over Ferrum's
                   processes, the peak comes from the totals and never from adding per-process peaks, a process that
                   ends keeps its CPU time in the total, a reused process id is a new process, the interval stays
                   within 100 ms to 60 s, and a moment that cannot be read fully is marked as a gap instead of a
                   smaller number; (2) the saved-data format gained the gap record and still accepts and refuses
                   the right files; (3) on this PC Windows fills every counter, including private working set;
                   (4) the only unsafe code of the measurement part is in its Windows module; (5) live: Ferrum with
                   two sites open, six readings 500 ms apart, each a correct total.
  Why            : We need trustworthy memory and CPU numbers → read them straight from Windows and add them up over
                   Ferrum's processes → one fair total per moment; peaks come from the total, never from adding
                   per-process peaks.
  What it changes: nothing. It starts Ferrum, which closes by itself (nothing is killed).
  How long       : about 2 minutes (longer the first time, while Rust compiles).
  How to run     : pwsh -NoProfile -File scripts/verify/p5.3-memory-cpu-meter.ps1   (do not use the PC meanwhile)
  Result         : PASS or FAIL (the line says what).
  Tell Claude    : "p5.3 check passed", or paste the FAIL lines.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    Phase-page verify field: Unit tests on aggregation logic (sum of private commit across the set; peak computed
    from the summed series, never a sum of per-process peaks).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p5.3' -Title 'Memory and CPU meter' -Phase 'phase-p5-telemetry' `
    -Why 'one fair total per moment; peaks come from the total, never from adding per-process peaks.'

$cargoBin = Join-Path $env:USERPROFILE '.cargo/bin'
if ((Test-Path -LiteralPath $cargoBin) -and ($env:PATH -notlike "*$cargoBin*")) { $env:PATH = "$cargoBin;$env:PATH" }

$script:Tests = $null
function Assert-Tests([string[]] $Names) {
    if (-not $script:Tests) { $script:Tests = Assert-Cargo @('test', '--locked', '-p', 'ferrum-telemetry', '--', '--nocapture') }
    foreach ($n in $Names) {
        if ($script:Tests.Output -notmatch "(?m)^test (\S+::)?$n \.\.\. ok") { Stop-Fail "Test '$n' did not run or did not pass." }
    }
}

Invoke-Step 'The adding-up rules: sums, peaks from the total, ended and reused processes, gaps, interval' {
    Assert-Tests @('the_tree_is_the_sum_of_private_commit_over_the_set',
        'the_peak_comes_from_the_summed_series_not_from_per_process_peaks',
        'a_refused_set_or_an_unreadable_member_gives_a_gap_not_a_smaller_number',
        'cpu_of_an_ended_process_stays_in_the_sum', 'a_reused_pid_is_a_new_process',
        'missing_cycle_counts_make_the_cycle_sum_unknown', 'the_interval_is_configurable_within_limits',
        'every_record_the_sampler_writes_is_valid')
    'eight unit tests passed'
}

Invoke-Step 'The saved-data format with the new gap record' {
    Assert-Tests @('every_record_type_round_trips_through_json', 'every_table_round_trips_through_csv',
        'the_good_fixture_is_accepted', 'every_corrupted_fixture_is_refused', 'json_schema_matches_the_types')
    'six record types; the damaged test files, one new, are all refused'
}

Invoke-Step 'Windows fills every counter on this PC' {
    Assert-Tests @('the_test_process_reads_its_own_counters', 'an_ended_process_reads_as_gone')
    $line = ($script:Tests.Output -split "`r?`n" | Where-Object { $_ -match '^own process: ' } | Select-Object -First 1)
    if (-not $line -or $line -notmatch 'private_working_set_bytes: Some\(\d+\)') { Stop-Fail 'No private working set was read.' }
    Add-LogText $line
    'memory, private working set, page faults, CPU time and cycles all read; an ended process reads as gone'
}

Invoke-Step 'Unsafe code only in the Windows module of the measurement part' {
    $lib = Read-RepoText 'crates/telemetry/src/lib.rs'
    if ($lib -notmatch '(?m)^#!\[deny\(unsafe_code\)\]') { Stop-Fail 'crates/telemetry/src/lib.rs does not deny unsafe code.' }
    if ($lib -notmatch '(?ms)#\[allow\(unsafe_code\)\]\s*pub mod win;') { Stop-Fail 'The allowance is not on the win module alone.' }
    if (([regex]::Matches($lib, 'allow\(unsafe_code\)')).Count -ne 1) { Stop-Fail 'unsafe code is allowed more than once.' }
    $src = Get-RepoPath 'crates/telemetry'
    $hits = @(Get-ChildItem -LiteralPath $src -Recurse -Filter '*.rs' | Where-Object { $_.FullName -notmatch '[\\/]target[\\/]' } |
        Where-Object { $_.Name -ne 'win.rs' } | Select-String -Pattern '\bunsafe\s*(\{|fn|impl)')
    if ($hits.Count) { Stop-Fail "unsafe code outside win.rs: $($hits[0].Path):$($hits[0].LineNumber)" }
    $win = Read-RepoText 'crates/telemetry/src/win.rs'
    $blocks = ([regex]::Matches($win, '\bunsafe\s*\{')).Count
    $safety = ([regex]::Matches($win, '// SAFETY:')).Count
    if ($blocks -lt 1 -or $safety -lt $blocks) { Stop-Fail "win.rs has $blocks unsafe blocks but $safety SAFETY comments." }
    "win.rs only: $blocks unsafe blocks, each with its SAFETY comment"
}

Invoke-Step 'Live: six readings over Ferrum''s processes, each a correct total' {
    $r = Invoke-FerrumSmoke -Spec @('sampler')
    $line = ($r.Output -split "`r?`n" | Where-Object { $_ -match 'SAMPLER: ' } | Select-Object -Last 1)
    Add-LogText (Get-Tail $r.Output 12)
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '1 passed') { Stop-Fail "The live test failed:`n$(Get-Tail $r.Output 30)" }
    if (-not $line) { Stop-Fail 'The live test printed no SAMPLER line.' }
    $line.Substring($line.IndexOf('SAMPLER: ') + 9)
}

Complete-Check -SaveEvidence:$SaveEvidence
