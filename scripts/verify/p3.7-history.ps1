#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.7 (P3 Tabs and sessions): Browsing history.

.DESCRIPTION
  What it checks : (1) unit tests of the history (crates/core/tests/history.rs): newest first, reloads merged,
                   titles, search, at most 1000 entries, saved and cleared; (2) the smoke test "history": pages that
                   loaded are recorded with their titles (a failed load is not), search works, the file in the data
                   folder follows, clearing empties the list and the file at once, and back/forward follow the
                   active tab.
  Why            : you want to find a page again, and to wipe the trail → keep a local list in Ferrum's data folder
                   only, searchable and clearable at once → useful, private, never in the project files.
  What it changes: nothing in git.
  How long       : about 30 seconds after the first build.
  How to run     : pwsh -NoProfile -File scripts/verify/p3.7-history.ps1
                   Needs the local development certificate (task p2.1) and ports 8443 and 9339 free.
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p3.7 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1, scripts/lib/Ferrum.SelfTest.ps1). Phase-page verify field:
    Unit tests on the history store; smoke test: clearing history empties the list and the file.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p3.7' -Title 'Browsing history' -Phase 'phase-p3-tabs-sessions' `
    -Why 'useful, private, never in the project files.'

Invoke-Step 'History unit tests' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-core', '--test', 'history')
    $need = 'visits_are_newest_first_and_repeats_merge', 'titles_attach_to_the_newest_entry',
    'search_matches_address_or_title_any_case', 'the_history_is_bounded', 'save_load_and_clear'
    $missing = @($need | Where-Object { $r.Output -notmatch "test $_ \.\.\. ok" })
    if ($missing.Count) { Stop-Fail "Not passing (or missing): $($missing -join ', ')." }
    "$($need.Count) required cases pass"
}

Invoke-Step 'Smoke test: recorded, searched, cleared (list and file); back/forward per tab' {
    $r = Invoke-FerrumSmoke -Spec 'history'
    Add-LogText (Get-Tail $r.Output 8)
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '\b4 passed') { Stop-Fail "The smoke test failed:`n$(Get-Tail $r.Output 20)" }
    'history: 4 passed (including the move to ferrum.db from p3.18)'
}

Invoke-Step 'History files are never part of the project' {
    $tracked = @(git -C (Get-RepoPath '.') ls-files '*history.json' '*session.json')
    if ($tracked.Count) { Stop-Fail "Tracked browsing-data files: $($tracked -join ', ')" }
    'no history.json or session.json in git'
}

Complete-Check -SaveEvidence:$SaveEvidence
