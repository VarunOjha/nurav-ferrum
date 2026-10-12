#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p2.14 (P2 First working app): Structured logs and crash records.

.DESCRIPTION
  What it checks : (1) unit tests: the WebView2 layer's errors are a proper type that prints as one line, and the
                   log keeps only the scheme and host of an address. (2) The whole smoke suite runs. Then every
                   Ferrum log file written in that run (logs/ferrum.jsonl in each test data folder) is read. Every
                   line must be one valid JSON object with time, level and source. No line may report a panic or
                   say "panicked". Every logged address must be only scheme and host (no page path, no query).
                   (3) A deliberate test crash (debug builds only) is written to the log as one "panic" line, and the
                   app still exits normally.
  Why            : when something goes wrong you need a record → Ferrum writes one tidy line per event and records
                   crashes, without keeping your browsing history → problems can be found and fixed.
  What it changes: nothing in git. Test data goes to the smoke suite's .data folder and the system temp folder.
  How long       : about 1 minute after the first build.
  How to run     : pwsh -NoProfile -File scripts/verify/p2.14-structured-logs-crashes.ps1
                   Needs the local development certificate (task p2.1) and ports 8443 and 9339 free.
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p2.14 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1, scripts/lib/Ferrum.SelfTest.ps1). Phase-page verify field: log file
                   produced in a smoke run parses as JSON lines; grep shows no 'panicked' entries.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p2.14' -Title 'Structured logs and crash records' -Phase 'phase-p2-minimal-container' `
    -Why 'problems can be found and fixed.'

$siteRule = '^([a-z][a-z0-9+.-]*:(//[^/?#]*)?|\(not an address\))$'

function Test-LogFile {
    # Returns @{ Lines; Problems; Panics; Sample } for one ferrum.jsonl file.
    param([Parameter(Mandatory)][string]$Path)
    $lines = @(Get-Content -LiteralPath $Path | Where-Object { $_.Trim() })
    $problems = [System.Collections.Generic.List[string]]::new()
    $panics = 0
    $n = 0
    foreach ($l in $lines) {
        $n++
        try { $o = $l | ConvertFrom-Json -AsHashtable } catch { $problems.Add("line ${n}: not valid JSON"); continue }
        foreach ($k in 'timestamp', 'level', 'target', 'fields') { if (-not $o.ContainsKey($k)) { $problems.Add("line ${n}: no '$k'") } }
        if ($l -match 'panicked') { $problems.Add("line ${n}: says 'panicked'") }
        if ($o.ContainsKey('fields') -and $o.fields -is [hashtable]) {
            if ($o.fields.ContainsKey('panic')) { $panics++ }
            if ($o.fields.ContainsKey('site') -and "$($o.fields.site)" -notmatch $siteRule) { $problems.Add("line ${n}: address logged with more than scheme and host") }
        }
    }
    @{ Lines = $lines.Count; Problems = $problems; Panics = $panics; Sample = ($lines | Select-Object -First 4) -join "`n" }
}

Invoke-Step 'Unit tests: typed WebView2 errors; logged addresses keep only scheme and host' {
    $a = Assert-Cargo @('test', '--locked', '-p', 'ferrum-core', '--test', 'address', 'site_keeps_only_scheme_and_host')
    if ($a -notmatch 'test result: ok\. 1 passed') { Stop-Fail "site() test did not pass:`n$(Get-Tail $a 8)" }
    $w = Assert-Cargo @('test', '--locked', '-p', 'ferrum-webview-manager')
    if ($w -notmatch 'errors_print_as_one_line \.\.\. ok') { Stop-Fail "Error type test did not pass:`n$(Get-Tail $w 8)" }
    'site_keeps_only_scheme_and_host ok; errors_print_as_one_line ok'
}

Invoke-Step 'Whole smoke suite; every log file of the run is JSON lines, no panic, addresses as scheme and host only' {
    $since = (Get-Date).AddSeconds(-2)
    $r = Invoke-FerrumSmoke -Spec ''
    Add-LogText (Get-Tail $r.Output 6)
    if ($r.ExitCode -ne 0) { Stop-Fail "The smoke suite failed:`n$(Get-Tail $r.Output 20)" }
    $files = @(Get-ChildItem -LiteralPath (Get-RepoPath 'apps/desktop/tests/smoke/.data') -Recurse -Filter 'ferrum.jsonl' |
        Where-Object { $_.LastWriteTime -ge $since })
    if ($files.Count -lt 5) { Stop-Fail "Expected a log file from each app start of the suite; found $($files.Count)." }
    $total = 0; $bad = @()
    foreach ($f in $files) {
        $t = Test-LogFile -Path $f.FullName
        $total += $t.Lines
        if ($t.Lines -eq 0) { $bad += "$($f.Directory.Parent.Name): empty log" }
        if ($t.Panics) { $bad += "$($f.Directory.Parent.Name): $($t.Panics) panic line(s)" }
        $bad += @($t.Problems | ForEach-Object { "$($f.Directory.Parent.Name): $_" })
    }
    Add-LogText ("Sample (first lines of one log):`n" + (Test-LogFile -Path $files[0].FullName).Sample)
    if ($bad.Count) { Stop-Fail "Log problems:`n$(($bad | Select-Object -First 15) -join "`n")" }
    "$($files.Count) log files, $total JSON lines, 0 panics, 0 problems"
}

Invoke-Step 'A deliberate test crash is written to the log as one panic line (debug build)' {
    $dir = Join-Path ([IO.Path]::GetTempPath()) "ferrum-p2.14-panic-$PID"
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    $cfg = Join-Path $dir 'config.toml'
    Set-Content -LiteralPath $cfg -Value "[storage]`ndata_dir = $(ConvertTo-Json ($dir -replace '\\', '/'))"
    $env:FERRUM_SELFTEST = 'panic'; $env:FERRUM_SELFTEST_OUT = Join-Path $dir 'out.json'
    try { $app = Start-Process -FilePath (Get-RepoPath 'target/debug/ferrum-desktop.exe') -ArgumentList '--config', "`"$cfg`"" -PassThru }
    finally { Remove-Item Env:FERRUM_SELFTEST, Env:FERRUM_SELFTEST_OUT -ErrorAction SilentlyContinue }
    if (-not $app.WaitForExit(60000)) { Stop-Fail 'The app did not finish the panic self-test (left running; close it by hand).' }
    if ($app.ExitCode -ne 0) { Stop-Fail "The app exited with code $($app.ExitCode) after the test crash." }
    $log = Join-Path $dir 'logs/ferrum.jsonl'
    if (-not (Test-Path -LiteralPath $log)) { Stop-Fail 'No log file was written.' }
    $t = Test-LogFile -Path $log
    $panicLines = @(Get-Content -LiteralPath $log | Where-Object { $_ -match '"panic":true' })
    Add-LogText ($panicLines -join "`n")
    $parsed = @($t.Problems | Where-Object { $_ -notmatch 'panicked' })
    if ($parsed.Count) { Stop-Fail "Log problems: $($parsed -join '; ')" }
    if ($t.Panics -ne 1 -or $panicLines[0] -notmatch 'ferrum test panic') { Stop-Fail "Expected exactly one panic line with the test message; found $($t.Panics)." }
    "exit code 0; $($t.Lines) JSON lines; 1 panic line with the test message"
}

Complete-Check -SaveEvidence:$SaveEvidence
