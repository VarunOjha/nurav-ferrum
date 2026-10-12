#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.14 (P3 Tabs and sessions): The settings screen.

.DESCRIPTION
  What it checks : (1) the shell's unit tests (the start-up sites box, among the shell's pure logic); (2) the smoke
                   test "settings": the screen changes start-up sites, a per-site named profile and the download folder;
                   the user settings file is written; the profile and the folder apply at once; after a restart the
                   start-up sites open and the settings are unchanged; invalid input (not a web address, not a site,
                   a folder that does not exist) is refused with plain messages and the file stays byte for byte the
                   same; (3) the p2.3 bridge lockdown test, whose probe page now also tries settings_set: a website is
                   refused, and Ferrum's own tab views have no bridge at all.
  Why            : settings in a text file are easy to get wrong → a settings screen in the trusted toolbar that only
                   asks the app, which checks everything and writes the file in one step → you can change Ferrum
                   safely, and no website can change it.
  What it changes: nothing in git.
  How long       : about 2 minutes after the first build.
  How to run     : pwsh -NoProfile -File scripts/verify/p3.14-settings-screen.ps1
                   Needs the local development certificate (task p2.1) and ports 8443 and 9339 free.
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p3.14 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1, scripts/lib/Ferrum.SelfTest.ps1). Phase-page verify field:
    Integration test drives the settings UI host commands to change startup sites, a per-site setting and the
    download folder, restarts, and asserts the changes persisted and took effect; invalid input (non-existent
    folder, unparseable URL) is rejected with an error and leaves the file unchanged; the p2.3 IPC denial test shows
    remote tabs cannot invoke the settings commands; shell unit tests cover the settings view.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p3.14' -Title 'The settings screen' -Phase 'phase-p3-tabs-sessions' `
    -Why 'you can change Ferrum safely, and no website can change it.'

Invoke-Step 'Shell unit tests (settings form logic included)' {
    $t = Assert-NpmScript 'test' -Folder 'apps/desktop'
    if ($t.Output -notmatch 'the start-up box takes one address per line') { Stop-Fail 'The settings form unit test did not run.' }
    'npm test: pass (start-up box test included)'
}

Invoke-Step 'Smoke test: change, take effect, restart, refuse bad input with the file unchanged' {
    $r = Invoke-FerrumSmoke -Spec 'settings'
    Add-LogText (Get-Tail $r.Output 7)
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '2 passed') { Stop-Fail "The smoke test failed:`n$(Get-Tail $r.Output 20)" }
    'settings: 2 passed'
}

Invoke-Step 'Websites cannot call the settings commands (p2.3 test, probe includes settings_set)' {
    if ((Read-RepoText 'tests/fixtures/server/src/lib.rs') -notmatch 'tryCall\("settings_set"') { Stop-Fail 'The probe page does not try settings_set.' }
    $r = Invoke-ChildScript 'scripts/verify/p2.3-lock-bridge-app.ps1'
    if ($r.ExitCode -ne 0) { Stop-Fail ("p2.3 did not pass: " + ((Get-StepProblems $r.Output) -join '; ')) }
    'p2.3: PASS (settings_set refused for a website; no bridge in tab views)'
}

Complete-Check -SaveEvidence:$SaveEvidence
