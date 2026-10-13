#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.19 (P3 feature set): bookmarks (star, bookmarks bar, sidebar folders, shortcuts).

.DESCRIPTION
  What it checks : (1) the core tests: the shortcut table has Ctrl+D, Ctrl+Shift+B and Ctrl+Shift+O, and the
                   [appearance] setting (bookmarks bar shown by default) round-trips; (2) the shell's unit tests,
                   with the bookmark rules (only web pages; folders grouped, the bar first); (3) the smoke test
                   "bookmarks": star a page, rename and move it, open from the bar and the sidebar, remove, Ctrl+D and
                   Ctrl+Shift+B in the shell, websites have no bridge, only web addresses accepted, bookmarks and the
                   bar setting survive a restart; (4) the smoke tests "sidebar" and "settings" still pass (the
                   sidebar gained a section, the settings file a section).
  Why            : you asked for bookmarks → they must be quick to add, easy to find, and kept safely.
  What it changes: nothing in git.
  How long       : about 3 minutes after the first build.
  How to run     : pwsh -NoProfile -File scripts/verify/p3.19-bookmarks.ps1
                   Needs the local development certificate (task p2.1) and ports 8443 and 9339 free.
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p3.19 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1, scripts/lib/Ferrum.SelfTest.ps1). Phase-page verify field:
    Smoke tests: star a page, it appears in the list; rename and delete work; a bookmark opens its page; bookmarks
    survive a restart; the p2.3 IPC denial test shows remote pages cannot call the bookmark commands.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p3.19' -Title 'Bookmarks' -Phase 'phase-p3-tabs-sessions' `
    -Why 'bookmarks must be quick to add, easy to find, and kept safely.'

Invoke-Step 'Core tests: bookmark shortcuts and the appearance setting' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-core', '--test', 'shortcuts', '--test', 'config')
    foreach ($n in 'every_browser_shortcut_maps', 'names_are_stable', 'appearance_defaults_and_round_trip') {
        if ($r.Output -notmatch "$n \.\.\. ok") { Stop-Fail "The test '$n' did not pass." }
    }
    'shortcut table and [appearance] tests pass'
}

Invoke-Step 'Shell unit tests (bookmark rules included)' {
    $t = Assert-NpmScript 'test' -Folder 'apps/desktop'
    foreach ($name in 'bookmarks: only web pages; grouped by folder', 'shell shortcuts follow the same table as the app') {
        if ($t.Output -notmatch [regex]::Escape($name)) { Stop-Fail "The unit test '$name' did not run." }
    }
    'npm test: pass'
}

Invoke-Step 'Smoke tests: bookmarks; sidebar and settings still work' {
    $r = Invoke-FerrumSmoke -Spec 'bookmarks.spec', 'sidebar.spec', 'settings.spec'
    if ($r.Output -match 'was not the active window') { Stop-Wait 'Ferrum was not the active window when keys were due; run the check again without using the PC meanwhile.' }
    Add-LogText (Get-Tail $r.Output 12)
    if ($r.ExitCode -ne 0 -or $r.Output -match '\d+ failed') { Stop-Fail "The smoke tests failed:`n$(Get-Tail $r.Output 25)" }
    foreach ($name in 'the star bookmarks the page into the bar', 'the bar opens pages', 'the sidebar lists every folder',
        'only web pages can be bookmarked; websites have no bridge', 'survive a restart') {
        if ($r.Output -notmatch [regex]::Escape($name)) { Stop-Fail "The smoke test '$name' did not run." }
    }
    "bookmarks + sidebar + settings: $(([regex]::Match($r.Output, '\d+ passed')).Value)"
}

Complete-Check -SaveEvidence:$SaveEvidence
