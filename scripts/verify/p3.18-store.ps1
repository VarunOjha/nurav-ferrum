#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.18 (P3 feature set): history and bookmarks in one local SQLite database file (adr-0032).

.DESCRIPTION
  What it checks : (1) the store's unit tests: SQLite's word index is compiled in; visits newest first with titles;
                   search by words of titles and addresses; the oldest entries go past 50 000; Clear history leaves
                   nothing in the tables, the index or the file; an old history.json is imported; a newer or damaged
                   file is refused, not overwritten; only web addresses can be bookmarked; (2) the licence and alert
                   check with the new building block (cargo deny); (3) the smoke test "history": the app records,
                   searches and clears history in ferrum.db, and imports an old history.json once.
  Why            : bookmarks, address-bar search and the backup all use this store → it must be correct, private
                   when cleared, and safe with your existing history.
  What it changes: nothing in git.
  How long       : about 2 minutes after the first build.
  How to run     : pwsh -NoProfile -File scripts/verify/p3.18-store.ps1
                   Needs the local development certificate (task p2.1) and ports 8443 and 9339 free.
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p3.18 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1, scripts/lib/Ferrum.SelfTest.ps1). Phase-page verify field:
    Unit tests: import from a sample history.json, round trip, search by title and address words, oldest entries
    dropped past the limit, Clear history leaves no entry in tables, index or file text, non-http(s) bookmark refused;
    cargo deny passes with the new crate; the p3.7 smoke test (clear empties the list) still passes.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p3.18' -Title 'History and bookmarks in a local database' -Phase 'phase-p3-tabs-sessions' `
    -Why 'bookmarks, address-bar search and the backup all rely on it.'

Invoke-Step 'Store unit tests' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-core', '--lib', 'store::')
    Add-LogText (Get-Tail $r.Output 20)
    $need = 'word_index_is_compiled_in', 'visits_newest_first_with_titles_and_no_duplicate_on_reload',
        'search_finds_words_of_titles_and_addresses_any_case', 'oldest_entries_go_past_the_limit',
        'clear_history_leaves_nothing_in_tables_index_or_file', 'imports_old_history_json_in_order',
        'survives_reopening_and_refuses_a_newer_file', 'a_damaged_file_is_an_error_not_a_crash',
        'bookmarks_only_web_addresses', 'bookmarks_add_rename_move_delete_and_search'
    foreach ($n in $need) {
        if ($r.Output -notmatch "store::tests::$n \.\.\. ok") { Stop-Fail "The unit test '$n' did not pass." }
    }
    "$($need.Count) named tests pass ($(([regex]::Match($r.Output, '\d+ passed')).Value))"
}

Invoke-Step 'Licences and alerts with the new building block' {
    [void](Assert-Cargo @('deny', 'check'))
    $tree = Assert-Cargo @('tree', '--locked', '-p', 'ferrum-core', '-e', 'normal', '--depth', '1')
    if ($tree.Output -notmatch 'rusqlite v0\.40\.2') { Stop-Fail 'ferrum-core does not use rusqlite 0.40.2.' }
    'cargo deny check: ok (rusqlite 0.40.2, MIT, in the core crate)'
}

Invoke-Step 'Smoke test: history in ferrum.db, import of history.json' {
    $r = Invoke-FerrumSmoke -Spec 'history.spec'
    Add-LogText (Get-Tail $r.Output 10)
    if ($r.ExitCode -ne 0 -or $r.Output -match '\d+ failed') { Stop-Fail "The smoke test failed:`n$(Get-Tail $r.Output 20)" }
    foreach ($name in 'an old history.json is imported once', 'clearing empties the list and the file at once') {
        if ($r.Output -notmatch [regex]::Escape($name)) { Stop-Fail "The smoke test '$name' did not run." }
    }
    "history: $(([regex]::Match($r.Output, '\d+ passed')).Value)"
}

Complete-Check -SaveEvidence:$SaveEvidence
