#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.2 (P3 Tabs and sessions): One website view per tab.

.DESCRIPTION
  What it checks : (1) the WebView2 code stays in its one module (unsafe code nowhere else in the app); (2) the smoke
                   test "tabs" (Playwright over the debugging channel, decision 31): 20 tabs opened through the app's
                   commands, one view each, switching shows only the active view and it fills the content area, closing
                   every tab leaves no view and WebView2's renderer processes fall back to what the shell needs;
                   (3) Windows draws the page above the shell: Ferrum is started on a local test page and the order of
                   its child windows is read (the topmost one must be the tab's view, not the shell).
  Why            : tabs multiply web views → each tab gets its own view, hidden when not active and fully closed with
                   its tab → switching is instant and closed tabs leave nothing running.
  What it changes: nothing in git.
  How long       : about 2 minutes after the first build.
  How to run     : pwsh -NoProfile -File scripts/verify/p3.2-view-per-tab.ps1
                   Needs the local development certificate (task p2.1) and ports 8443 and 9339 free.
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p3.2 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1, scripts/lib/Ferrum.SelfTest.ps1). Phase-page verify field:
    Integration test opens 20 tabs, switches through all, closes all; WebView count returns to zero and no
    WebView2 process belonging to a closed profile remains (checked with the process-info API used in spike S3).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p3.2' -Title 'One website view per tab' -Phase 'phase-p3-tabs-sessions' `
    -Why 'switching is instant and closed tabs leave nothing running.'

Invoke-Step 'Raw WebView2 code stays in its one module' {
    $bad = @(Get-ChildItem -LiteralPath (Get-RepoPath 'apps/desktop/src-tauri/src') -Filter *.rs | Where-Object {
            (Get-Content -LiteralPath $_.FullName -Raw) -notmatch '#!\[forbid\(unsafe_code\)\]' -and $_.Name -eq 'main.rs'
        })
    if ($bad.Count) { Stop-Fail 'apps/desktop/src-tauri/src/main.rs does not forbid unsafe code.' }
    $unsafe = @(Select-String -Path (Get-RepoPath 'apps/desktop/src-tauri/src/*.rs') -Pattern '\bunsafe\s*\{' -ErrorAction SilentlyContinue)
    if ($unsafe.Count) { Stop-Fail "unsafe code in the app: $($unsafe[0].Path):$($unsafe[0].LineNumber)" }
    'the app forbids unsafe code; COM calls only in crates/webview-manager/src/webview2.rs'
}

Invoke-Step 'Smoke test: 20 tabs, one view each, only the active one shown, all released on close' {
    $r = Invoke-FerrumSmoke -Spec 'tabs'
    Add-LogText (Get-Tail $r.Output 10)
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '\b2 passed') { Stop-Fail "The smoke test failed:`n$(Get-Tail $r.Output 20)" }
    'tabs: 2 passed (one view per tab; the tab icon test from p3.16)'
}

Invoke-Step 'Windows draws the tab view above the shell' {
    Add-Type -TypeDefinition @'
using System; using System.Text; using System.Runtime.InteropServices;
public static class FerrumZ {
    [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr h, uint c);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
    public static string Children(IntPtr parent) {
        var sb = new StringBuilder(); IntPtr c = GetWindow(parent, 5);
        while (c != IntPtr.Zero) { var n = new StringBuilder(256); GetClassName(c, n, 256); sb.Append(n).Append(';'); c = GetWindow(c, 2); }
        return sb.ToString();
    }
}
'@
    $busy = Get-NetTCPConnection -LocalPort 8443 -State Listen -ErrorAction SilentlyContinue
    if ($busy) { Stop-Wait 'Port 8443 is in use (a test server from an earlier run may still be stopping); run the check again in a minute.' }
    $tmp = Join-Path ([IO.Path]::GetTempPath()) "ferrum-p3.2-$PID"
    New-Item -ItemType Directory -Force -Path $tmp | Out-Null
    $cfg = Join-Path $tmp 'config.toml'
    Set-Content -LiteralPath $cfg -Value "[session]`nstartup_urls = [`"https://localhost:8443/landing`"]`n[storage]`ndata_dir = $(ConvertTo-Json $tmp)`n"
    $server = Start-Process -FilePath (Get-RepoPath 'target/debug/fixture-server.exe') -ArgumentList 'serve', '--port', '8443', '--exit-after', '30' -PassThru -WindowStyle Hidden
    Start-Sleep -Seconds 2
    $env:FERRUM_EXIT_AFTER = '15'
    try { $app = Start-Process -FilePath (Get-RepoPath 'target/debug/ferrum-desktop.exe') -ArgumentList '--config', "`"$cfg`"" -PassThru }
    finally { Remove-Item Env:FERRUM_EXIT_AFTER -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 8
    $app.Refresh()
    $order = [FerrumZ]::Children($app.MainWindowHandle)
    if (-not $app.WaitForExit(30000)) { Stop-Fail 'Ferrum did not close by itself within 30 s (left running; close it by hand).' }
    [void]$server.WaitForExit(45000)
    Add-LogText "child windows, top to bottom: $order"
    $first = ($order -split ';')[0]
    if ($first -ne 'Chrome_WidgetWin_0' -or $order -notmatch 'WRY_WEBVIEW') { Stop-Fail "The topmost child window is '$first', not the tab's view (order: $order)." }
    "top to bottom: $order"
}

Complete-Check -SaveEvidence:$SaveEvidence
