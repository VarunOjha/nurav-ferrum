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
                   through the IPC bridge; every call is rejected and the rejection is logged. (The Ferrum-created
                   content controller of adr-0029 joins this self-test in p2.6.)
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

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

Invoke-Step 'Self-test: every bridge call from a website is refused; the shell still works' {
    $b = Invoke-Npm -Arguments @('run', 'build') -Folder 'apps/desktop'
    if ($b.ExitCode -ne 0) { Stop-Fail "Shell build failed: $(Get-Tail $b.Output 5)" }
    [void](Assert-Cargo @('build', '--locked', '-p', 'ferrum-desktop', '-p', 'fixture-server'))
    $out = Join-Path ([IO.Path]::GetTempPath()) "ferrum-p2.3-ipc-$PID.json"
    $server = Start-Process -FilePath (Get-RepoPath 'target/debug/fixture-server.exe') -ArgumentList 'serve', '--port', '8443', '--exit-after', '45' -PassThru -WindowStyle Hidden
    Start-Sleep -Seconds 2
    $env:FERRUM_SELFTEST = 'ipc'; $env:FERRUM_SELFTEST_OUT = $out
    try {
        $app = Start-Process -FilePath (Get-RepoPath 'target/debug/ferrum-desktop.exe') -PassThru
        if (-not $app.WaitForExit(60000)) { Stop-Fail 'The app did not finish its self-test within 60 s (left running; close it by hand).' }
    }
    finally { Remove-Item Env:FERRUM_SELFTEST, Env:FERRUM_SELFTEST_OUT -ErrorAction SilentlyContinue }
    [void]$server.WaitForExit(60000)
    if (-not (Test-Path -LiteralPath $out)) { Stop-Fail 'The self-test wrote no result.' }
    $raw = Get-Content -LiteralPath $out -Raw
    Add-LogText $raw
    $r = $raw | ConvertFrom-Json
    if ($SaveEvidence) {
        $dest = Get-RepoPath 'wiki/raw/evidence/phase-p2-minimal-container/p2.3-ipc-selftest.json'
        if (-not (Test-Path -LiteralPath $dest)) { [void](Save-Evidence -Path 'wiki/raw/evidence/phase-p2-minimal-container/p2.3-ipc-selftest.json' -Text $raw) }
    }
    if (-not $r.probe_view_created -or $null -eq $r.probe_report) { Stop-Fail 'The probe page did not load or did not report (is the local certificate installed? is port 8443 free?).' }
    if (-not $r.all_probe_calls_refused) { Stop-Fail 'A bridge call from the website was NOT refused.' }
    if ($r.shell_positive_control_pings -lt 1) { Stop-Fail 'The shell could not use the bridge (positive control failed).' }
    "refused: app command, event listen, event emit; shell pings: $($r.shell_positive_control_pings)"
}

Complete-Check -SaveEvidence:$SaveEvidence
