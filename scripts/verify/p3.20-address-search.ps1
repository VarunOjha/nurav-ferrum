#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.20 (P3 feature set): search of the past from the address bar.

.DESCRIPTION
  What it checks : (1) the store's tests for suggestions (each page once; one page can be forgotten); (2) the shell's
                   unit tests for the suggestion rules (word starts, highlighting, groups, limits, "how long ago");
                   (3) the smoke test "address-search": typing shows open tabs, bookmarks and history in groups;
                   the list never sits under the page (the page view moves down while it is open); arrow keys and
                   Enter open a row, an open tab is switched to; Esc closes; Shift+Delete forgets a history page; a
                   click opens a row; (4) the smoke tests "history" and "bookmarks" still pass.
  Why            : you asked to find past pages from the address bar → typing a few letters of a title must find it.
  What it changes: nothing in git.
  How long       : about 3 minutes after the first build.
  How to run     : pwsh -NoProfile -File scripts/verify/p3.20-address-search.ps1
                   Needs the local development certificate (task p2.1) and ports 8443 and 9339 free.
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p3.20 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1, scripts/lib/Ferrum.SelfTest.ps1). Phase-page verify field:
    Smoke tests: typing part of a visited title shows it; arrow keys and Enter open it; Esc closes the list; the
    list's area and the page view never overlap while it is open; an open tab is offered as switch-to-tab; shell unit
    tests cover ranking.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p3.20' -Title 'Search of the past from the address bar' -Phase 'phase-p3-tabs-sessions' `
    -Why 'typing a few letters of a title must find the page.'

Invoke-Step 'Store tests for suggestions' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-core', '--lib', 'store::')
    if ($r.Output -notmatch 'suggestions_list_each_page_once_and_one_page_can_be_forgotten \.\.\. ok') {
        Stop-Fail 'The store test for suggestions did not pass.'
    }
    "store tests: $(([regex]::Match($r.Output, '\d+ passed')).Value)"
}

Invoke-Step 'Shell unit tests (suggestion rules)' {
    $t = Assert-NpmScript 'test' -Folder 'apps/desktop'
    foreach ($name in 'suggestions: words start words', 'suggestions: grouped tabs, bookmarks, history', 'history rows say how long ago') {
        if ($t.Output -notmatch [regex]::Escape($name)) { Stop-Fail "The unit test '$name' did not run." }
    }
    'npm test: pass'
}

Invoke-Step 'Smoke tests: address-bar search; history and bookmarks still work' {
    $r = Invoke-FerrumSmoke -Spec 'address-search.spec', 'history.spec', 'bookmarks.spec'
    Add-LogText (Get-Tail $r.Output 14)
    if ($r.ExitCode -ne 0 -or $r.Output -match '\d+ failed') { Stop-Fail "The smoke tests failed:`n$(Get-Tail $r.Output 25)" }
    foreach ($name in 'typing shows open tabs, bookmarks and history in groups, never under the page',
        'arrow keys and Enter', 'Shift+Delete forgets a history page') {
        if ($r.Output -notmatch [regex]::Escape($name)) { Stop-Fail "The smoke test '$name' did not run." }
    }
    "address-search + history + bookmarks: $(([regex]::Match($r.Output, '\d+ passed')).Value)"
}

Complete-Check -SaveEvidence:$SaveEvidence
