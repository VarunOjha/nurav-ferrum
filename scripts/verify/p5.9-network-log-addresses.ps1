#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p5.9 (P5 Measurement): Network log: addresses and timings only.

.DESCRIPTION
  What it checks : (1) the log's record has exactly the allowed fields and no header, cookie or body field; bad
                   records are refused; files rotate; only Ferrum's own old session folders are deleted (unit tests);
                   (2) the settings: the log is off by default, its limits are checked (unit test); (3) live, with the
                   log switched on: a test page with a known set of requests (its stylesheet, script, an image, a
                   frame of another site and one fetch) gives exactly the expected entries, a refused address is
                   logged once, as blocked (no response line, Q-231), and every record holds only the allowed fields; with the default settings the
                   log is off and writes nothing.
  Why            : You asked for a log of network calls → per tab, save address, method, result, type, size and the
                   security decision to one folder per session, never headers or page content → useful for research
                   without storing private data.
  What it changes: nothing. It starts Ferrum twice, which closes by itself (nothing is killed).
  How long       : about 3 minutes (longer the first time, while Rust compiles).
  How to run     : pwsh -NoProfile -File scripts/verify/p5.9-network-log-addresses.ps1   (do not use the PC meanwhile)
  Result         : PASS or FAIL (the line says what).
  Tell Claude    : "p5.9 check passed", or paste the FAIL lines.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    Phase-page verify field: Integration test: fixture page with a known set of resources (including one
    cross-origin iframe and one fetch) produces exactly the expected entries; a negative test asserts no header or
    body fields exist in any record.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p5.9' -Title 'Network log: addresses and timings only' -Phase 'phase-p5-telemetry' `
    -Why 'useful for research without storing private data.'

$cargoBin = Join-Path $env:USERPROFILE '.cargo/bin'
if ((Test-Path -LiteralPath $cargoBin) -and ($env:PATH -notlike "*$cargoBin*")) { $env:PATH = "$cargoBin;$env:PATH" }

function Assert-Passed($Output, [string[]] $Names) {
    foreach ($n in $Names) {
        if ($Output -notmatch "(?m)^test (\S+::)?$n \.\.\. ok") { Stop-Fail "Test '$n' did not run or did not pass." }
    }
}

Invoke-Step 'The record: only the allowed fields, bad records refused, rotation, old sessions deleted safely' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-network-logger')
    Assert-Passed $r.Output @('a_record_has_exactly_the_allowed_fields_and_no_header_cookie_or_body', 'checks_refuse_bad_values',
        'resource_types_from_fetch_destinations', 'times_and_session_names', 'the_writer_rotates_and_keeps_at_most_max_files',
        'prune_deletes_only_old_session_folders_and_only_log_files')
    'six unit tests passed (including the negative test: no header, cookie or body field)'
}

Invoke-Step 'The settings: off by default, limits checked' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-core', '--test', 'config', 'network_log')
    Assert-Passed $r.Output @('network_log_is_off_by_default_and_its_limits_are_checked')
    'off by default, 14 days kept; out-of-range values and a folder outside the data folder refused'
}

Invoke-Step 'Live: exactly the expected entries; a refused address logged as blocked; off by default' {
    $r = Invoke-FerrumSmoke -Spec @('network-log\.spec')  # exactly this file: the p5.10 files start with the same name
    Add-LogText (Get-Tail $r.Output 20)
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '2 passed') { Stop-Fail "The live test failed:`n$(Get-Tail $r.Output 30)" }
    $out = $r.Output -split "`r?`n"
    $at = [array]::FindLastIndex([string[]]$out, [Predicate[string]] { param($l) $l -match 'NETLOG: ' })
    if ($at -lt 0) { Stop-Fail 'The live test printed no NETLOG lines.' }
    $rows = @($out[$at..($out.Count - 1)] | Where-Object { $_ -match 'NETLOG|^\s+(GET|blocked| https)' } | ForEach-Object { $_.Trim() })
    $off = $out | Where-Object { $_ -match 'NETLOG-OFF: ' } | Select-Object -Last 1
    ($rows -join "`n") + "`n" + $off.Trim()
}

Complete-Check -SaveEvidence:$SaveEvidence
