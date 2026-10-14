#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p4.9 (P4 Security): every refused action is written to the security audit log, and only safe facts.

.DESCRIPTION
  What it checks : (1) unit tests: an audit line has exactly six fields (time, tab, origin, action, rule, decision),
                   the origin keeps scheme and host only, times are correct UTC, and the file rotates (three old files
                   kept); (2) the code: every place Ferrum refuses something writes an audit line; (3) live tests: the
                   security tests of tasks 3, 4, 5 and 8 each find their own audit line, every line passes the schema
                   check, and a dedicated test makes Ferrum refuse six kinds of action with a secret in the address
                   and in typed text: one line each, and the secret, the path and the typed text never appear.
  Why            : refusals must be traceable without becoming a browsing history → one short line per refusal, in a
                   fixed shape, never page content → you can see what Ferrum blocked, and nothing private leaks.
  What it changes: nothing (builds the app and the test pages in target/; test data under the smoke-test folder).
  How long       : about five minutes (builds, then Ferrum opens and closes by itself several times).
  How to run     : pwsh -NoProfile -File scripts/verify/p4.9-security-audit-log.ps1
  Result         : PASS (every checked step is fine) or FAIL (the line says what).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p4.9 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    Do not use the PC while the live tests run. Phase-page verify field: Every security test asserts its matching audit
    record exists; a schema test validates all records.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p4.9' -Title 'Security audit log' -Phase 'phase-p4-security' `
    -Why 'you can see what Ferrum blocked, and nothing private leaks.'

$cargoBin = Join-Path $env:USERPROFILE '.cargo/bin'
if ((Test-Path -LiteralPath $cargoBin) -and ($env:PATH -notlike "*$cargoBin*")) { $env:PATH = "$cargoBin;$env:PATH" }

Invoke-Step 'Unit tests: six fields, origin only, UTC times, rotation' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-desktop', 'audit::')
    foreach ($n in 'a_line_has_exactly_the_six_fields_and_no_path_or_query', 'times_are_utc_rfc3339', 'the_file_rotates_and_keeps_three_old_files') {
        if ($r.Output -notmatch "(?m)^test (\S+::)?$n \.\.\. ok") { Stop-Fail "Test '$n' did not run or did not pass." }
    }
    'three unit tests passed'
}

Invoke-Step 'Every place that refuses something writes an audit line' {
    $need = @{
        'apps/desktop/src-tauri/src/policy.rs'    = 3   # navigation, permission, shell
        'apps/desktop/src-tauri/src/content.rs'   = 1   # typed address
        'apps/desktop/src-tauri/src/external.rs'  = 2   # pop-up limit, forged confirmation
        'apps/desktop/src-tauri/src/downloads.rs' = 2   # no folder, folder not usable
    }
    foreach ($k in $need.Keys) {
        $n = ([regex]::Matches((Read-RepoText $k), 'audit::record\(')).Count
        if ($n -lt $need[$k]) { Stop-Fail "$k has $n audit calls, expected at least $($need[$k])." }
    }
    'audit calls present at every refusal point'
}

$script:Sample = ''
Invoke-Step 'Live tests: each security test finds its audit line; all lines pass the schema; no page content' {
    $r = Invoke-FerrumSmoke -Spec @('audit-log', 'security-navigation', 'external-schemes', 'permissions', 'app-origin')
    $line = ($r.Output -split "`r?`n" | Where-Object { $_ -match 'AUDIT-SAMPLE ' } | Select-Object -First 1)
    if ($line) { $script:Sample = $line.Substring($line.IndexOf('AUDIT-SAMPLE ')) }
    Add-LogText (Get-Tail $r.Output 12)
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '18 passed') { Stop-Fail "The live tests failed:`n$(Get-Tail $r.Output 30)" }
    if ($script:Sample) { Add-LogText $script:Sample }
    'audit-log 1, security-navigation 5, external-schemes 3, permissions 4, app-origin 5: 18 passed'
}

Complete-Check -SaveEvidence:$SaveEvidence
