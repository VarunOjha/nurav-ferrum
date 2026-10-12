#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.1 (P3 Tabs and sessions): Tab rules as plain code.

.DESCRIPTION
  What it checks : the tab model in crates/core/src/tabs.rs (no window, no WebView2) passes its tests: one fixed test
                   per rule, and 200 random sequences of 500 operations (open, close, switch, move, next, previous,
                   reopen, including unknown ids) that check every rule after every step.
  Why            : tab logic has many edge cases → write it without the window and test random sequences of actions →
                   exactly one active tab, ids never reused, closing the active tab picks a neighbour.
  What it changes: nothing in git.
  How long       : about 20 seconds after the first build.
  How to run     : pwsh -NoProfile -File scripts/verify/p3.1-tab-rules.ps1
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p3.1 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). Phase-page verify field:
    Unit tests plus randomised operation-sequence tests assert invariants: exactly one active tab when at
    least one exists; ids never reused; closing the active tab activates a neighbour.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p3.1' -Title 'Tab rules as plain code' -Phase 'phase-p3-tabs-sessions' `
    -Why 'exactly one active tab, ids never reused.'

Invoke-Step 'The tab model lives in the core crate, which forbids unsafe code' {
    if ((Read-RepoText 'crates/core/src/lib.rs') -notmatch '#!\[forbid\(unsafe_code\)\]') { Stop-Fail 'crates/core/src/lib.rs does not forbid unsafe code.' }
    if ((Read-RepoText 'crates/core/src/lib.rs') -notmatch 'pub mod tabs;') { Stop-Fail 'crates/core/src/lib.rs has no tabs module.' }
    'crates/core/src/tabs.rs, #![forbid(unsafe_code)]'
}

Invoke-Step 'Tab rule tests pass, including the random operation sequences' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-core', '--test', 'tabs')
    $need = 'first_tab_is_active_and_ids_count_up', 'closing_the_active_tab_activates_a_neighbour',
    'closing_another_tab_keeps_the_active_one', 'ids_are_never_reused_even_after_reopen', 'next_and_previous_wrap_around',
    'move_keeps_the_active_tab_and_clamps', 'unknown_ids_change_nothing', 'closed_stack_is_bounded',
    'random_operation_sequences_keep_every_rule'
    $missing = @($need | Where-Object { $r.Output -notmatch "test $_ \.\.\. ok" })
    if ($missing.Count) { Stop-Fail "Not passing (or missing): $($missing -join ', ')." }
    $line = ($r.Output -split "`r?`n" | Where-Object { $_ -match 'test result: ok' } | Select-Object -First 1).Trim()
    "$($need.Count) required cases pass ($line)"
}

Complete-Check -SaveEvidence:$SaveEvidence
