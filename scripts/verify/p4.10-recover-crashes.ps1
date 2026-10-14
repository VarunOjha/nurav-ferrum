#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p4.10 (P4 Security): Ferrum recovers when a page's process or the whole browser engine fails.

.DESCRIPTION
  What it checks : (1) unit tests: the crash test hook lets one tab load one crash page once, and a second engine
                   failure right after a restart does not restart Ferrum again (no restart loop); (2) the code: every tab
                   view listens for WebView2's ProcessFailed event and stops listening when it closes, Ferrum watches
                   for the browser engine's exit, and the crash hook works in debug builds only; (3) live tests: a tab's
                   page process is ended on purpose (the browser's own edge://kill page, as in spike S3): the tab is
                   marked crashed, the shell shows "This page stopped working" with Reload, another site's tab and the
                   shell keep working, and Reload brings the page back; crash pages are refused outside the hook; and
                   when the whole engine is ended on purpose, Ferrum closes in order, starts again by itself and brings
                   the tabs back.
  Why            : a page's process can crash or hang → Ferrum notices, covers only that tab and offers Reload → one bad
                   page never takes down the window or the other tabs, and an engine crash costs no tabs.
  What it changes: nothing (builds the app and the test pages in target/; test data under the smoke-test folder).
  How long       : about four minutes (builds, then Ferrum opens and closes by itself a few times).
  How to run     : pwsh -NoProfile -File scripts/verify/p4.10-recover-crashes.ps1
  Result         : PASS (every checked step is fine) or FAIL (the line says what).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p4.10 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    Do not use the PC while the live tests run. Phase-page verify field: Test deliberately crashes a tab renderer (method
    from spike S3) and asserts the crashed state, then reload succeeds; shell stays responsive.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p4.10' -Title 'Recovery from crashed pages' -Phase 'phase-p4-security' `
    -Why 'one bad page never takes down the window or the other tabs, and an engine crash costs no tabs.'

$cargoBin = Join-Path $env:USERPROFILE '.cargo/bin'
if ((Test-Path -LiteralPath $cargoBin) -and ($env:PATH -notlike "*$cargoBin*")) { $env:PATH = "$cargoBin;$env:PATH" }

Invoke-Step 'Unit tests: crash page allowed once for one tab; no restart loop' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-desktop', 'recovery::')
    foreach ($n in 'crash_pages_pass_the_gate_once_and_only_for_the_armed_tab', 'a_second_browser_failure_right_after_a_restart_does_not_restart_again') {
        if ($r.Output -notmatch "(?m)^test (\S+::)?$n \.\.\. ok") { Stop-Fail "Test '$n' did not run or did not pass." }
    }
    'two unit tests passed'
}

Invoke-Step 'The code listens for failed processes and the engine exit; the crash hook is debug-only' {
    $wv = Read-RepoText 'crates/webview-manager/src/webview2.rs'
    foreach ($n in 'add_ProcessFailed', 'remove_ProcessFailed', 'add_BrowserProcessExited') {
        if ($wv -notmatch "$n\(") { Stop-Fail "webview2.rs does not call $n." }
    }
    if ((Read-RepoText 'apps/desktop/src-tauri/src/main.rs') -notmatch 'watch_browser_exit\(') { Stop-Fail 'main.rs does not watch the browser engine exit.' }
    $rec = Read-RepoText 'apps/desktop/src-tauri/src/recovery.rs'
    if ($rec -notmatch 'cfg!\(debug_assertions\) && CRASH_PAGES' -or $rec -notmatch 'if !cfg!\(debug_assertions\) \{\s*return Err\("not available in release builds"') {
        Stop-Fail 'recovery.rs: the crash hook is not limited to debug builds.'
    }
    'ProcessFailed added and removed per tab view; engine exit watched; crash hook debug-only'
}

Invoke-Step 'Live tests: a crashed tab is marked, covered and reloaded; the engine crash restarts Ferrum with its tabs' {
    $r = Invoke-FerrumSmoke -Spec @('crash-recovery')
    $shared = ($r.Output -split "`r?`n" | Where-Object { $_ -match "CRASH-SHARED " } | Select-Object -First 1)
    Add-LogText (Get-Tail $r.Output 8)
    if ($shared) { Add-LogText $shared.Substring($shared.IndexOf("CRASH-SHARED ")) }
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '3 passed') { Stop-Fail "The live tests failed:`n$(Get-Tail $r.Output 30)" }
    'crash-recovery: 3 passed (tab crash and reload, crash pages refused outside the hook, engine crash and restart)'
}

Complete-Check -SaveEvidence:$SaveEvidence
