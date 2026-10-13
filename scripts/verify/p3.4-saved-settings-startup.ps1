#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.4 (P3 Tabs and sessions): Saved settings and start-up sites.

.DESCRIPTION
  What it checks : (1) unit tests of the settings file (crates/core/tests/config.rs): saved and read back unchanged,
                   saving replaces a file in one step and leaves no temporary file, a file from a newer Ferrum is
                   refused with a clear error and not touched, a version-1 (P2) file is upgraded and keeps its
                   behaviour, an unreadable file is copied aside; (2) the smoke test "startup": start-up sites open as
                   tabs in order (the first active), an unreadable user file leaves a backup and Ferrum starts with the
                   defaults, a newer file stays untouched.
  Why            : settings change over versions → give the file a version, write it in one step, keep what cannot be
                   read → an update or a crash never loses or garbles your settings.
  What it changes: nothing in git.
  How long       : about 40 seconds after the first build.
  How to run     : pwsh -NoProfile -File scripts/verify/p3.4-saved-settings-startup.ps1
                   Needs the local development certificate (task p2.1) and ports 8443 and 9339 free.
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p3.4 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1, scripts/lib/Ferrum.SelfTest.ps1). Phase-page verify field:
    Unit tests: round trip, unknown future version refused with a clear error, corrupted file falls back to
    defaults and keeps a backup; integration test: startup sites open in order.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p3.4' -Title 'Saved settings and start-up sites' -Phase 'phase-p3-tabs-sessions' `
    -Why 'an update or a crash never loses or garbles your settings.'

Invoke-Step 'Settings file unit tests, one per required case' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-core', '--test', 'config')
    $need = 'save_then_load_round_trips', 'save_replaces_an_existing_file', 'newer_version_is_refused_with_a_clear_error',
    'version_one_file_is_migrated_and_keeps_its_behaviour', 'corrupted_file_is_backed_up'
    $missing = @($need | Where-Object { $r.Output -notmatch "test $_ \.\.\. ok" })
    if ($missing.Count) { Stop-Fail "Not passing (or missing): $($missing -join ', ')." }
    $line = ($r.Output -split "`r?`n" | Where-Object { $_ -match 'test result: ok' } | Select-Object -First 1).Trim()
    "$($need.Count) required cases pass ($line)"
}

Invoke-Step 'Smoke test: start-up sites in order; broken and newer settings files handled' {
    $r = Invoke-FerrumSmoke -Spec 'startup'
    Add-LogText (Get-Tail $r.Output 8)
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '\b3 passed') { Stop-Fail "The smoke test failed:`n$(Get-Tail $r.Output 20)" }
    'startup: 3 passed'
}

Complete-Check -SaveEvidence:$SaveEvidence
