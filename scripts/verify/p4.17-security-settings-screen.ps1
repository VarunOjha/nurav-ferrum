#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p4.17 (P4 Security): Security settings screen.

.DESCRIPTION
  What it checks : (1) unit tests: blocked sites from the screen are checked line by line, cleaned and kept when the
                   screen does not send them; site permissions keep the kinds the screen does not show; the "not secure"
                   bar text; (2) live tests through the settings screen itself: add a blocked site and grant a site
                   camera and notifications, save, restart: both are kept and enforced (the blocked address is refused
                   and audited, the notification grant is honoured); unticking revokes it; a bad rule is refused with its
                   line; a plain-HTTP page shows the "not secure" bar, an HTTPS page does not; "Clear data" in a site row
                   deletes that site's stored data; (3) the earlier settings and
                   permission tests still pass; (4) the IPC self-test of P2: a website's call to the settings command is
                   refused and the tab views have no bridge.
  Why            : You manage blocked sites and permissions → add them to the settings screen through checked app
                   commands → websites still cannot touch them.
  What it changes: nothing (builds the app and the test pages in target/; test data under the smoke-test folder).
  How long       : about four minutes (builds, then Ferrum opens and closes by itself several times).
  How to run     : pwsh -NoProfile -File scripts/verify/p4.17-security-settings-screen.ps1
  Result         : PASS (every checked step is fine) or FAIL (the line says what).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p4.17 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    Do not use the PC while the live tests run. Phase-page verify field: Integration test adds a blocklist domain and a
    camera grant through the settings UI host commands, restarts, and asserts both persisted and enforced (blocked
    navigation logged; grant honoured, then revoked); the p2.3 IPC denial test shows remote tabs cannot call these
    commands. The camera grant is checked as kept and shown, not used (that would switch on the PC's real camera); the
    grant's effect is proven with notifications.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p4.17' -Title 'Security settings screen' -Phase 'phase-p4-security' `
    -Why 'websites still cannot touch them.'

$cargoBin = Join-Path $env:USERPROFILE '.cargo/bin'
if ((Test-Path -LiteralPath $cargoBin) -and ($env:PATH -notlike "*$cargoBin*")) { $env:PATH = "$cargoBin;$env:PATH" }

Invoke-Step 'Unit tests: blocked sites checked and kept; permissions merged; the not-secure bar text' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-desktop', 'settings::')
    foreach ($n in 'blocked_sites_are_checked_cleaned_and_kept_when_not_sent', 'a_bad_blocked_site_is_refused_with_its_line') {
        if ($r.Output -notmatch "(?m)^test (\S+::)?$n \.\.\. ok") { Stop-Fail "Test '$n' did not run or did not pass." }
    }
    $s = Invoke-Npm -Arguments @('run', 'test') -Folder 'apps/desktop'
    if ($s.ExitCode -ne 0 -or $s.Output -notmatch 'the not-secure bar' -or $s.Output -notmatch 'site permissions: shown kinds') {
        Stop-Fail "Shell unit tests failed or the new ones did not run:`n$(Get-Tail $s.Output 15)"
    }
    'two host tests and the shell tests passed'
}

Invoke-Step 'Live tests: set in the screen, kept after a restart, enforced, revoked; the not-secure bar; earlier settings and permission tests' {
    $r = Invoke-FerrumSmoke -Spec @('security-settings', 'settings', 'permissions')
    Add-LogText (Get-Tail $r.Output 14)
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '(?m)^\s+\d+ passed' -or $r.Output -match '(?m)^\s+\d+ failed') {
        Stop-Fail "The live tests failed:`n$(Get-Tail $r.Output 30)"
    }
    foreach ($t in 'blocked sites and site permissions', 'the not-secure bar shows', 'Clear data in the screen') {
        if ($r.Output -notmatch [regex]::Escape($t)) { Stop-Fail "Live test '$t' did not run." }
    }
    ($r.Output -split "`r?`n" | Where-Object { $_ -match '^\s+\d+ passed' } | Select-Object -Last 1).Trim() + ' (security-settings, settings, permissions)'
}

Invoke-Step 'IPC self-test: a website cannot call the settings command; tab views have no bridge' {
    $st = Invoke-FerrumSelfTest -Name 'ipc'
    $r = $st.Result
    Add-LogText $st.Raw
    if ($null -eq $r.tauri_view.report) { Stop-Fail 'The probe page did not load in the Tauri view.' }
    if ($r.tauri_view.report.settings_command.ok -ne $false) { Stop-Fail 'A website''s call to settings_set was NOT refused.' }
    if (-not $r.tauri_view.all_calls_refused) { Stop-Fail 'A bridge call from the website was NOT refused.' }
    if (-not $r.content_view.no_bridge) { Stop-Fail 'A Ferrum-created tab view exposes a bridge.' }
    'settings_set from a website refused; every other probed call refused; tab views have no bridge'
}

Complete-Check -SaveEvidence:$SaveEvidence
