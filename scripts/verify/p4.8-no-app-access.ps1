#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p4.8 (P4 Security): websites cannot reach Ferrum's own controls or load Ferrum's own pages.

.DESCRIPTION
  What it checks : (1) self-test: a website shown in an extra Tauri view tries every way into the app (Ferrum's
                   commands, including those added in P4, events, Tauri's built-in plugin commands): every call is
                   refused by the permission check; Tauri's internal channel command is exempt from that check, so it
                   is reached, but it returns nothing because Ferrum creates no channels (also checked); the same
                   website in a Ferrum tab finds no bridge at all;
                   the shell's own call still works; (2) live test: a tab's page has no bridge; links, a pop-up and a
                   typed address pointing at Ferrum's own pages are all refused and logged, and no tab ever shows
                   one; (3) the code: the app's commands are allowed for the shell's capability only, with no remote
                   section, and nothing relies on Tauri's invoke key.
  Why            : the shell can call the app, a website must not → no bridge in tabs, every command allowed for the
                   shell only, tabs refuse Ferrum's own address → a website cannot act as Ferrum.
  What it changes: nothing (builds the app and the test pages in target/; test data under the smoke-test folder).
  How long       : about three minutes (a self-test run, then the live test).
  How to run     : pwsh -NoProfile -File scripts/verify/p4.8-no-app-access.ps1
  Result         : PASS (every checked step is fine) or FAIL (the line says what).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p4.8 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    Do not use the PC while it runs. -SaveEvidence also saves the self-test JSON (p4.8-ipc-selftest.json). Phase-page
    verify field: Security tests from a remote-origin fixture for each listed path all fail; a test attempts top-level
    navigation of a tab to the app's local origin and it is blocked.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p4.8' -Title 'No app access for websites' -Phase 'phase-p4-security' `
    -Why 'a website cannot act as Ferrum.'

$cargoBin = Join-Path $env:USERPROFILE '.cargo/bin'
if ((Test-Path -LiteralPath $cargoBin) -and ($env:PATH -notlike "*$cargoBin*")) { $env:PATH = "$cargoBin;$env:PATH" }

$script:SelfTest = $null
Invoke-Step 'Self-test: every way into the app refused from a website; no bridge in tabs; shell still works' {
    $st = Invoke-FerrumSelfTest -Name 'ipc'
    $script:SelfTest = $st.Raw
    $r = $st.Result
    $rep = $r.tauri_view.report
    if (-not $rep) { Stop-Fail 'The probe page reported nothing.' }
    $keys = 'app_command', 'event_listen', 'event_emit', 'settings_command', 'bookmark_command', 'history_command',
        'suggest_command', 'backup_command', 'appearance_command', 'private_tab_command', 'site_clear_command',
        'processes_command', 'plugin_app', 'plugin_path', 'plugin_webview', 'plugin_window'
    $allowed = @(foreach ($k in $keys) {
            $v = $rep.PSObject.Properties[$k]
            if (-not $v) { "$k (not tried)" } elseif ($v.Value.ok -ne $false -or $v.Value.error -notmatch 'not allowed') { $k }
        })
    if ($allowed) { Stop-Fail ('Not refused by the permission check: ' + ($allowed -join ', ')) }
    # Tauri exempts its internal channel-fetch command from the permission check, so a page in a Tauri view reaches it.
    # It returns only data the app sent into a channel; Ferrum creates no channels (checked below), so there is none.
    $cf = $rep.PSObject.Properties['channel_fetch']
    if (-not $cf -or $cf.Value.ok -ne $false) { Stop-Fail 'The internal channel-fetch command returned data to the website.' }
    $code = (Get-ChildItem -LiteralPath (Get-RepoPath 'apps/desktop/src-tauri/src') -Filter '*.rs' | ForEach-Object { [IO.File]::ReadAllText($_.FullName) }) -join "`n"
    $code += (Get-ChildItem -LiteralPath (Get-RepoPath 'apps/desktop/src') -Filter '*.ts' | ForEach-Object { [IO.File]::ReadAllText($_.FullName) }) -join "`n"
    if ($code -match 'ipc::Channel|new Channel\(') { Stop-Fail 'Ferrum now uses Tauri channels: the exempt channel-fetch command could hand their data to a website.' }
    if (-not $r.content_view.no_bridge) { Stop-Fail 'A Ferrum tab view has a bridge to the app.' }
    if (-not ($r.shell_positive_control_pings -gt 0)) { Stop-Fail "The shell's own call did not work (positive control)." }
    "$($keys.Count) ways in refused by the permission check; channel fetch reached but empty (Ferrum has no channels: $($cf.Value.error)); no bridge in tabs; shell call works"
}

Invoke-Step 'Live test: links, pop-up and typed address to Ferrum own pages refused and logged; shell stays on its own page' {
    $r = Invoke-FerrumSmoke -Spec 'app-origin'
    Add-LogText (Get-Tail $r.Output 10)
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '5 passed') { Stop-Fail "The live test failed:`n$(Get-Tail $r.Output 30)" }
    'app-origin: 5 passed (including: the shell cannot be led to a website)'
}

Invoke-Step 'Commands allowed for the shell only; nothing relies on the invoke key' {
    $cap = Read-RepoText 'apps/desktop/src-tauri/capabilities/shell.json' | ConvertFrom-Json
    if (@($cap.webviews) -join ',' -ne 'shell') { Stop-Fail 'The capability targets more than the shell web view.' }
    if ($cap.PSObject.Properties['remote']) { Stop-Fail 'The capability has a remote section: websites could call commands.' }
    $caps = @(Get-ChildItem -LiteralPath (Get-RepoPath 'apps/desktop/src-tauri/capabilities') -Filter '*.json')
    if ($caps.Count -ne 1) { Stop-Fail "Expected one capability file, found $($caps.Count)." }
    $src = (Get-ChildItem -LiteralPath (Get-RepoPath 'apps/desktop/src-tauri/src') -Filter '*.rs' | ForEach-Object { [IO.File]::ReadAllText($_.FullName) }) -join "`n"
    if ($src -match '(?i)invoke_key|__TAURI_INVOKE_KEY__') { Stop-Fail 'The app code refers to the invoke key.' }
    'one capability, shell only, no remote section, no invoke key'
}

if ($SaveEvidence -and $script:SelfTest) {
    $written = Save-Evidence -Path 'wiki/raw/evidence/phase-p4-security/p4.8-ipc-selftest.json' -Text $script:SelfTest
    Write-Note "Self-test result saved: $written"
}

Complete-Check -SaveEvidence:$SaveEvidence
