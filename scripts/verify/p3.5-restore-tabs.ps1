#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.5 (P3 Tabs and sessions): Restore tabs after a restart or a crash.

.DESCRIPTION
  What it checks : (1) unit tests of the session file (crates/core/tests/session.rs): saved and read back unchanged,
                   never half-written, newer or broken files refused; (2) the smoke test "restore": tabs and the active
                   tab come back after a normal exit; after a crash (the debug-only test_crash command ends Ferrum at
                   once, like a crash; no kill command) the last save comes back; a restored tab whose site cannot be
                   reached shows Ferrum's error panel; with restore_on_startup = false the start-up pages open instead.
  Why            : people lose work when a browser forgets their tabs → save the tab list often, in one step, and on
                   exit → after a restart or a crash your tabs are back.
  What it changes: nothing in git.
  How long       : about 40 seconds after the first build.
  How to run     : pwsh -NoProfile -File scripts/verify/p3.5-restore-tabs.ps1
                   Needs the local development certificate (task p2.1) and ports 8443 and 9339 free.
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p3.5 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1, scripts/lib/Ferrum.SelfTest.ps1). Phase-page verify field:
    Integration tests: normal exit then restart restores tabs; forced process kill then restart restores the
    last persisted state; restore of a tab whose site is now unreachable shows the error state, not a crash.
    (The forced end is the app's own abort, not a kill command: the owner's standing rule.)
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p3.5' -Title 'Restore tabs after a restart or a crash' -Phase 'phase-p3-tabs-sessions' `
    -Why 'after a restart or a crash your tabs are back.'

Invoke-Step 'Session file unit tests' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-core', '--test', 'session')
    $need = 'save_then_load_round_trips', 'missing_file_is_no_session', 'newer_or_broken_files_are_refused',
    'an_active_index_outside_the_list_is_dropped', 'saving_never_leaves_half_a_file'
    $missing = @($need | Where-Object { $r.Output -notmatch "test $_ \.\.\. ok" })
    if ($missing.Count) { Stop-Fail "Not passing (or missing): $($missing -join ', ')." }
    "$($need.Count) required cases pass"
}

Invoke-Step 'Smoke test: normal exit, crash, unreachable site, restore switched off' {
    $r = Invoke-FerrumSmoke -Spec 'restore'
    Add-LogText (Get-Tail $r.Output 9)
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '\b4 passed') { Stop-Fail "The smoke test failed:`n$(Get-Tail $r.Output 20)" }
    'restore: 4 passed'
}

Complete-Check -SaveEvidence:$SaveEvidence
