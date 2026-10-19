#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p5.1 (P5 Measurement): Export file format and run labels.

.DESCRIPTION
  What it checks : (1) every record type saves and reloads unchanged, as a data file and as a table; (2) the file
                   writer starts a new file when one gets big and never leaves a half-written file under a finished
                   name; (3) the checker accepts good files and refuses each of the damaged test files; (4)
                   the published format description (JSON Schema) matches the code.
  Why            : Every later result is read from files → define one versioned format (plain data files) that
                   labels each run with code version, Windows build, WebView2 version and settings → any number can
                   be traced to the exact setup that made it.
  What it changes: nothing (the tests write only into target\test-tmp).
  How long       : under a minute (longer the first time, while Rust compiles).
  How to run     : pwsh -NoProfile -File scripts/verify/p5.1-export-file-format.ps1
  Result         : PASS or FAIL (the line says what).
  Tell Claude    : "p5.1 check passed", or paste the FAIL lines.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    Phase-page verify field: Unit tests: every record type round-trips; a schema validator (Rust test or Python
    script) accepts generated files and rejects a corrupted fixture.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p5.1' -Title 'Export file format and run labels' -Phase 'phase-p5-telemetry' `
    -Why 'any number can be traced to the exact setup that made it.'

$cargoBin = Join-Path $env:USERPROFILE '.cargo/bin'
if ((Test-Path -LiteralPath $cargoBin) -and ($env:PATH -notlike "*$cargoBin*")) { $env:PATH = "$cargoBin;$env:PATH" }

$script:Tests = $null
function Assert-Tests([string[]] $Names) {
    if (-not $script:Tests) { $script:Tests = Assert-Cargo @('test', '--locked', '-p', 'ferrum-telemetry', 'export::') }
    foreach ($n in $Names) {
        if ($script:Tests.Output -notmatch "(?m)^test (\S+::)?$n \.\.\. ok") { Stop-Fail "Test '$n' did not run or did not pass." }
    }
}

Invoke-Step 'Each record type saves and reloads unchanged (data file and table)' {
    Assert-Tests @('every_record_type_round_trips_through_json', 'every_table_round_trips_through_csv',
        'csv_columns_match_the_record_fields', 'csv_refuses_bad_tables')
    'seven record types as JSON lines, six tables as CSV (sample_gap added by p5.3, lifecycle_transition by p5.8)'
}

Invoke-Step 'The writer rotates files and leaves no half file under a finished name' {
    Assert-Tests @('writer_output_is_accepted_and_rotates_by_size', 'an_unfinished_file_stays_part_and_is_refused',
        'writer_refuses_bad_input_and_reused_run_ids')
    'rotation by size; a crash leaves a .part file that the checker refuses'
}

Invoke-Step 'The checker accepts good files and refuses each damaged one' {
    $dir = 'crates/telemetry/tests/fixtures/export-v1'
    $bad = @(Get-ChildItem -LiteralPath (Get-RepoPath $dir) -Filter 'corrupt-*.jsonl')
    if ($bad.Count -lt 1) { Stop-Fail "No damaged test files in $dir." }
    Assert-Tests @('the_good_fixture_is_accepted', 'every_corrupted_fixture_is_refused')
    "good test file accepted; $($bad.Count) damaged test files refused, each for its own reason"
}

Invoke-Step 'The published format description matches the code' {
    Assert-RepoFile 'crates/telemetry/schema/v1/record.schema.json'
    Assert-Tests @('json_schema_matches_the_types')
    Add-LogText (Get-Tail $script:Tests.Output 4)
    'crates/telemetry/schema/v1/record.schema.json'
}

Complete-Check -SaveEvidence:$SaveEvidence
