#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p5.8 (P5 Measurement): Record tab state changes.

.DESCRIPTION
  What it checks : (1) the result file format has the tab-change record (from, to, why, when, which tab), and its
                   checker refuses impossible changes (unit tests, plus the file-format tests rerun with the new
                   record); (2) the rules that turn "tab shown, hidden or closed" into records, one per real change
                   (unit tests); (3) live: Ferrum with two tabs, switched back and forth and one closed, writes the
                   matching hide and show records, and every one passes the format check.
  Why            : Smart tab sleeping in P7 needs a record of every tab state change → define the record now and log
                   hide and show → P7 plugs in without a new format.
  What it changes: nothing. It starts Ferrum, which closes by itself (nothing is killed).
  How long       : about 2 minutes (longer the first time, while Rust compiles).
  How to run     : pwsh -NoProfile -File scripts/verify/p5.8-record-tab-state.ps1   (do not use the PC meanwhile)
  Result         : PASS or FAIL (the line says what).
  Tell Claude    : "p5.8 check passed", or paste the FAIL lines.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    Phase-page verify field: Unit test writes and validates transition records; integration test sees hide/show
    records when switching tabs.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p5.8' -Title 'Record tab state changes' -Phase 'phase-p5-telemetry' `
    -Why 'P7 plugs in without a new format.'

$cargoBin = Join-Path $env:USERPROFILE '.cargo/bin'
if ((Test-Path -LiteralPath $cargoBin) -and ($env:PATH -notlike "*$cargoBin*")) { $env:PATH = "$cargoBin;$env:PATH" }

function Assert-Passed($Output, [string[]] $Names) {
    foreach ($n in $Names) {
        if ($Output -notmatch "(?m)^test (\S+::)?$n \.\.\. ok") { Stop-Fail "Test '$n' did not run or did not pass." }
    }
}

Invoke-Step 'The file format has the tab-change record; every record type still saves, reloads and checks' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-telemetry', 'export::')
    Assert-Passed $r.Output @('every_record_type_round_trips_through_json', 'every_table_round_trips_through_csv',
        'csv_columns_match_the_record_fields', 'the_good_fixture_is_accepted', 'every_corrupted_fixture_is_refused',
        'json_schema_matches_the_types')
    'seven record types (lifecycle_transition new), six tables; good file accepted, damaged files refused; schema matches'
}

Invoke-Step 'Tab changes become records, one per real change; impossible changes are refused' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-telemetry', 'lifecycle::')
    Assert-Passed $r.Output @('switching_tabs_writes_one_hide_and_one_show_that_validate',
        'the_error_panel_covering_the_selected_tab_is_its_own_trigger', 'the_checker_refuses_impossible_transitions')
    'three unit tests passed'
}

Invoke-Step 'Live: switching and closing tabs writes hide and show records that pass the format check' {
    $r = Invoke-FerrumSmoke -Spec @('lifecycle')
    $out = $r.Output -split "`r?`n"
    $at = [array]::FindLastIndex([string[]]$out, [Predicate[string]] { param($l) $l -match 'LIFECYCLE: ' })
    Add-LogText (Get-Tail $r.Output 16)
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '1 passed') { Stop-Fail "The live test failed:`n$(Get-Tail $r.Output 30)" }
    if ($at -lt 0) { Stop-Fail 'The live test printed no LIFECYCLE lines.' }
    $rows = @($out[($at + 1)..($out.Count - 1)] | Where-Object { $_ -match ' ms tab ' } | ForEach-Object { $_.Trim() })
    if ($rows.Count -ne 9) { Stop-Fail "Expected 9 records, got $($rows.Count)." }
    "9 records, none refused:`n" + ($rows -join "`n")
}

Complete-Check -SaveEvidence:$SaveEvidence
