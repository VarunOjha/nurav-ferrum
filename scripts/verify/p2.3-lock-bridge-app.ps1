#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p2.3 (P2 First working app): Lock the bridge to the app.

.DESCRIPTION
  What it checks : no capability file has a "remote" section; the only capability targets the shell web view;
                   the app declares its commands at build time (so each needs an explicit permission); and a
                   self-test in the real app: a hostile page served over HTTPS by the local test server tries an
                   app command, the event plugin's listen and emit through the bridge, and every call is refused,
                   while the shell's own call still works. The refusals are written to a JSON record.
  Why            : websites must never reach Ferrum's commands → limit the bridge to the shell and test the
                   refusal → the security floor holds from the first website loaded.
  What it changes: nothing in git. Builds go to ignored folders. The local test server and the app run for a
                   few seconds and stop by themselves.
  How long       : about 30 seconds (a first build takes a few minutes).
  How to run     : pwsh -NoProfile -File scripts/verify/p2.3-lock-bridge-app.ps1
                   Needs the local development certificate installed (task p2.1) and port 8443 free.
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p2.3 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). Phase-page verify field: integration test loads a fixture page in
                   the content WebView that calls an app command, a core plugin command and event emit/listen
                   through the IPC bridge; every call is rejected and the rejection is logged. Since p2.6 the same
                   page also runs in the content view Ferrum creates itself (adr-0029), which must have no bridge.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p2.3' -Title 'Lock the bridge to the app' -Phase 'phase-p2-minimal-container' `
    -Why 'a website cannot control Ferrum.'

$caps = 'apps/desktop/src-tauri/capabilities'

Invoke-Step 'Only the shell has a capability, and none allows remote pages' {
    $files = @(Get-ChildItem -LiteralPath (Get-RepoPath $caps) -Filter '*.json')
    if ($files.Count -ne 1 -or $files[0].Name -ne 'shell.json') { Stop-Fail "Expected exactly capabilities/shell.json; found: $($files.Name -join ', ')." }
    $j = Get-Content -LiteralPath $files[0].FullName -Raw | ConvertFrom-Json -AsHashtable
    if ($j.ContainsKey('remote')) { Stop-Fail 'shell.json has a remote section.' }
    if (-not $j.ContainsKey('webviews') -or (@($j['webviews']) -join ',') -ne 'shell') { Stop-Fail 'shell.json must target exactly the "shell" web view.' }
    if ($j.ContainsKey('windows')) { Stop-Fail 'shell.json targets windows; it must target the "shell" web view only.' }
    'shell.json: webviews ["shell"], no remote section'
}

Invoke-Step 'The app declares its commands at build time' {
    if ((Read-RepoText 'apps/desktop/src-tauri/build.rs') -notmatch 'AppManifest::new\(\)\.commands\(') { Stop-Fail 'build.rs has no app ACL manifest (AppManifest::new().commands(...)).' }
    'build.rs: AppManifest commands declared'
}

Invoke-Step 'Self-test: website calls refused in a Tauri view; no bridge at all in the Ferrum-created view; the shell works' {
    $st = Invoke-FerrumSelfTest -Name 'ipc'
    $r = $st.Result
    Add-LogText $st.Raw
    if ($SaveEvidence) {
        $dest = 'wiki/raw/evidence/phase-p2-minimal-container/p2.6-ipc-selftest.json'
        if (-not (Test-Path -LiteralPath (Get-RepoPath $dest))) { [void](Save-Evidence -Path $dest -Text $st.Raw) }
    }
    if (-not $r.tauri_view.created -or $null -eq $r.tauri_view.report) { Stop-Fail 'The probe page did not load in the Tauri view (local certificate installed? port 8443 free?).' }
    if (-not $r.tauri_view.all_calls_refused) { Stop-Fail 'A bridge call from the website in the Tauri view was NOT refused.' }
    if (-not $r.content_view.no_bridge) { Stop-Fail 'The Ferrum-created content view exposes a bridge (or did not report).' }
    if ($r.shell_positive_control_pings -lt 1) { Stop-Fail 'The shell could not use the bridge (positive control failed).' }
    foreach ($k in 'settings_command', 'bookmark_command', 'history_command', 'suggest_command', 'backup_command', 'appearance_command') {
        if ($null -eq $r.tauri_view.report.$k) { Stop-Fail "The probe page did not try $k (old probe page?)." }
    }
    "Tauri view: 9 calls refused (bridge, events, settings, bookmarks, history, suggestions, backup, appearance); content view: no bridge; shell pings: $($r.shell_positive_control_pings)"
}

Complete-Check -SaveEvidence:$SaveEvidence
