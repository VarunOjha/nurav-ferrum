#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p2.12 (P2 First working app): Developer tools only in test builds.

.DESCRIPTION
  What it checks : the developer tools (DevTools) of both Ferrum views (the website view and the toolbar) are off
                   in the release build and on in the debug (test) build. For each build the script starts Ferrum
                   in its "devtools" self-test. Ferrum reports the DevTools setting of both views, then puts focus in
                   the website view and later in the toolbar. Each time, the script presses F12 and Ctrl+Shift+I,
                   the keys a person would use, and looks for a new DevTools window. Release: both views say "off"
                   and no DevTools window appears. Debug: both say "on" and the keys open DevTools in the website
                   view, which shows the key presses really reach Ferrum.
  Why            : developer tools let anyone look inside and change a page → the version you use must not offer
                   them, while test builds keep them → nobody opens them by accident in the real app.
  What it changes: nothing in git. It builds the release app (target/release) if needed.
                   Keys are pressed only while Ferrum is the active window. Please do not type during the check.
  How long       : about 2 minutes (the release build takes most of it).
  How to run     : pwsh -NoProfile -File scripts/verify/p2.12-devtools-debug-only.ps1
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits, for example Ferrum could not be made the active window).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p2.12 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). Phase-page verify field: release build has DevTools disabled
                   (opening attempt has no effect); debug build can open them. Observed while building p2.12: the
                   AreDevToolsEnabled setting blocks F12 and the context menu, but a direct OpenDevToolsWindow call
                   still opens them, so Ferrum's code makes no such call (crates/webview-manager/src/webview2.rs).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p2.12' -Title 'Developer tools only in test builds' -Phase 'phase-p2-minimal-container' `
    -Why 'nobody opens them by accident in the real app.'

if (-not ('FerrumWin' -as [type])) {
    Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
public static class FerrumWin {
    delegate bool EnumProc(IntPtr h, IntPtr p);
    [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc f, IntPtr p);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    public static uint ForegroundPid() { uint pid; GetWindowThreadProcessId(GetForegroundWindow(), out pid); return pid; }
    public static List<string> VisibleTitles() {
        var list = new List<string>();
        EnumWindows((h, p) => {
            if (IsWindowVisible(h)) {
                var sb = new StringBuilder(512); GetWindowText(h, sb, 512);
                uint pid; GetWindowThreadProcessId(h, out pid);
                if (sb.Length > 0) list.Add(pid + "|" + sb.ToString());
            }
            return true;
        }, IntPtr.Zero);
        return list;
    }
}
'@
}

function Get-DevToolsWindows {
    # Visible windows titled "DevTools…" that belong to a WebView2 process.
    $wv = @(Get-Process msedgewebview2 -ErrorAction SilentlyContinue | ForEach-Object { [uint32]$_.Id })
    @([FerrumWin]::VisibleTitles() | Where-Object {
            $p = $_.Split('|', 2); ($wv -contains [uint32]$p[0]) -and $p[1] -like 'DevTools*'
        } | ForEach-Object { $_.Split('|', 2)[1] })
}

function Invoke-DevToolsSelfTest {
    param([Parameter(Mandatory)][string]$Exe)
    if (Get-DevToolsWindows) { Stop-Wait 'A DevTools window is already open on this PC; close it and run the check again.' }
    $out = Join-Path ([IO.Path]::GetTempPath()) "ferrum-devtools-$PID-$([IO.Path]::GetFileNameWithoutExtension((Split-Path -Parent $Exe)))-$(Get-Random).json"
    $env:FERRUM_SELFTEST = 'devtools'; $env:FERRUM_SELFTEST_OUT = $out
    try { $app = Start-Process -FilePath (Get-RepoPath $Exe) -PassThru }
    finally { Remove-Item Env:FERRUM_SELFTEST, Env:FERRUM_SELFTEST_OUT -ErrorAction SilentlyContinue }
    $shell = New-Object -ComObject WScript.Shell
    $attempts = [ordered]@{}
    $done = @{}
    $deadline = (Get-Date).AddSeconds(90)
    while (-not $app.HasExited -and (Get-Date) -lt $deadline) {
        Start-Sleep -Milliseconds 200
        $phaseFile = "$out.phase"
        if (-not (Test-Path -LiteralPath $phaseFile)) { continue }
        $view = (Get-Content -LiteralPath $phaseFile -Raw -ErrorAction SilentlyContinue)
        if (-not $view -or $done.ContainsKey($view)) { continue }
        $before = @(Get-DevToolsWindows)
        if ([FerrumWin]::ForegroundPid() -ne $app.Id) { [void]$shell.AppActivate($app.Id); Start-Sleep -Milliseconds 600 }
        $front = [FerrumWin]::ForegroundPid() -eq $app.Id
        if ($front) {
            $shell.SendKeys('{F12}'); Start-Sleep -Milliseconds 1200
            if ([FerrumWin]::ForegroundPid() -eq $app.Id) { $shell.SendKeys('^+i') }
            Start-Sleep -Milliseconds 2000
        }
        $new = @(Get-DevToolsWindows | Where-Object { $before -notcontains $_ })
        $attempts[$view] = [pscustomobject]@{ KeysSent = $front; NewDevToolsWindows = $new }
        $done[$view] = $true
        Set-Content -LiteralPath "$out.ack-$view" -Value 'ok'
    }
    if (-not $app.WaitForExit(30000)) { Stop-Fail "Ferrum ($Exe) did not finish its self-test (left running; close it by hand)." }
    if (-not (Test-Path -LiteralPath $out)) { Stop-Fail "The self-test of $Exe wrote no result." }
    $result = Get-Content -LiteralPath $out -Raw | ConvertFrom-Json
    Remove-Item -LiteralPath $out -ErrorAction SilentlyContinue
    foreach ($v in 'content', 'shell') {
        if (-not $attempts.Contains($v)) { Stop-Fail "The self-test did not hand over the '$v' view." }
        if (-not $attempts[$v].KeysSent) { Stop-Wait "Ferrum was not the active window when the keys were due ('$v' view); run the check again without using the PC meanwhile." }
    }
    [pscustomobject]@{ Result = $result; Attempts = $attempts }
}

function Format-Attempts($a) {
    ($a.Keys | ForEach-Object { "$_ view: new DevTools windows = $(@($a[$_].NewDevToolsWindows).Count)" }) -join '; '
}

Invoke-Step 'Build the shell, the debug app and the release app' {
    $b = Invoke-Npm -Arguments @('run', 'build') -Folder 'apps/desktop'
    if ($b.ExitCode -ne 0) { Stop-Fail "Shell build failed: $(Get-Tail $b.Output 5)" }
    [void](Assert-Cargo @('build', '--locked', '-p', 'ferrum-desktop'))
    $r = Invoke-Npm -Arguments @('run', 'tauri', '--', 'build', '--no-bundle') -Folder 'apps/desktop'
    if ($r.ExitCode -ne 0) { Stop-Fail "Release build failed:`n$(Get-Tail $r.Output 10)" }
    'debug and release builds ready'
}

Invoke-Step 'Release build: DevTools off in both views; F12 and Ctrl+Shift+I open nothing' {
    $r = Invoke-DevToolsSelfTest -Exe 'target/release/ferrum-desktop.exe'
    Add-LogText ($r.Result | ConvertTo-Json -Depth 5)
    if ($r.Result.build -ne 'release') { Stop-Fail "Expected a release build, got '$($r.Result.build)'." }
    if ($r.Result.devtools_enabled.content -ne $false -or $r.Result.devtools_enabled.shell -ne $false) {
        Stop-Fail "DevTools are not off in the release build: $($r.Result.devtools_enabled | ConvertTo-Json -Compress)"
    }
    $opened = @($r.Attempts.Values | ForEach-Object { $_.NewDevToolsWindows })
    if ($opened.Count) { Stop-Fail "A DevTools window opened in the release build: $($opened -join ', ')" }
    "content=off, shell=off; $(Format-Attempts $r.Attempts)"
}

Invoke-Step 'Debug build: DevTools on in both views; F12 opens them in the website view' {
    $r = Invoke-DevToolsSelfTest -Exe 'target/debug/ferrum-desktop.exe'
    Add-LogText ($r.Result | ConvertTo-Json -Depth 5)
    if ($r.Result.devtools_enabled.content -ne $true -or $r.Result.devtools_enabled.shell -ne $true) {
        Stop-Fail "DevTools are not on in the debug build: $($r.Result.devtools_enabled | ConvertTo-Json -Compress)"
    }
    if (-not @($r.Attempts['content'].NewDevToolsWindows).Count) { Stop-Fail 'F12 / Ctrl+Shift+I opened no DevTools window in the debug build (the key presses may not reach Ferrum).' }
    "content=on, shell=on; $(Format-Attempts $r.Attempts)"
}

Complete-Check -SaveEvidence:$SaveEvidence
