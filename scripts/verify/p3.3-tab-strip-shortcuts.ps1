#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.3 (P3 Tabs and sessions): Tab strip and keyboard shortcuts.

.DESCRIPTION
  What it checks : (1) the shortcut table: unit tests in Rust (crates/core/tests/shortcuts.rs) and in the shell
                   (apps/desktop/src/logic.test.ts) list the same keys; (2) the smoke test "shortcuts": every shortcut
                   (switch, new, close, reopen, address bar, back, forward, reload) works with focus in the shell and
                   with focus inside a page, and a shortcut pressed in a page never reaches the page while ordinary
                   keys do; (3) the p2.3 bridge lockdown test still passes (pages still cannot call the app).
  Why            : a browser you can only use with the mouse is slow → take browser shortcuts before the page sees
                   them, through WebView2's own key hook, with nothing added to the page → fast and still safe.
  What it changes: nothing in git.
  How long       : about 3 minutes after the first build. The page tests press real keys: Ferrum comes to the front
                   for a few seconds at a time; please do not type meanwhile.
  How to run     : pwsh -NoProfile -File scripts/verify/p3.3-tab-strip-shortcuts.ps1
                   Needs the local development certificate (task p2.1) and ports 8443 and 9339 free.
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p3.3 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1, scripts/lib/Ferrum.SelfTest.ps1). Phase-page verify field:
    Smoke tests send each shortcut with focus in the shell and with focus in a tab; the action happens; the
    p2.3 IPC denial test still passes.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p3.3' -Title 'Tab strip and keyboard shortcuts' -Phase 'phase-p3-tabs-sessions' `
    -Why 'shortcuts work everywhere, and pages still cannot reach the app.'

Invoke-Step 'Shortcut table: Rust and shell unit tests' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-core', '--test', 'shortcuts')
    if ($r.Output -notmatch 'test result: ok\. 4 passed') { Stop-Fail "Rust shortcut tests: $(Get-Tail $r.Output 8)" }
    $t = Assert-NpmScript 'test' -Folder 'apps/desktop'
    if ($t.Output -notmatch 'shell shortcuts follow the same table') { Stop-Fail 'The shell shortcut unit test did not run.' }
    'ferrum-core shortcuts: 4 passed; shell unit tests pass (shortcut table included)'
}

Invoke-Step 'Smoke test: every shortcut with focus in the shell and in a page' {
    $r = Invoke-FerrumSmoke -Spec 'shortcuts'
    Add-LogText (Get-Tail $r.Output 14)
    if ($r.Output -match 'was not the active window') { Stop-Wait 'Ferrum was not the active window when keys were due; run the check again without using the PC meanwhile.' }
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '\b9 passed') { Stop-Fail "The smoke test failed:`n$(Get-Tail $r.Output 20)" }
    'shortcuts: 9 passed'
}

Invoke-Step 'The p2.3 bridge lockdown test still passes' {
    $r = Invoke-ChildScript 'scripts/verify/p2.3-lock-bridge-app.ps1'
    if ($r.ExitCode -ne 0) { Stop-Fail ("p2.3 did not pass: " + ((Get-StepProblems $r.Output) -join '; ')) }
    'p2.3: PASS'
}

Complete-Check -SaveEvidence:$SaveEvidence
