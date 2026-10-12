#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.23 (P3 feature set): the feature set is part of the P3 tests, the gate and your checklist.

.DESCRIPTION
  What it checks : (1) the P3 test suite (npm run p3, task p3.11) includes the feature set's app tests (bookmarks,
                   address-bar search, backup, look); (2) every feature set task (p3.17 to p3.23) has its own check
                   script, so the P3 gate runs them all; (3) your checklist has the feature set's items (14 to 20:
                   look and logo, appearance settings, new-tab page, bookmarks, address-bar search, backup and
                   restore, your old history) and the gate's "your part" names them.
  Why            : the new features must keep working, and you check them by hand before signing off.
  What it changes: nothing.
  How long       : a few seconds (the tests themselves run in the P3 suite and the gate).
  How to run     : pwsh -NoProfile -File scripts/verify/p3.23-feature-set-tests.ps1
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p3.23 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    Phase-page verify field: The P3 gate runs the new tests and passes; docs/testing/manual-checklist-p3.md has the
    new items.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p3.23' -Title 'The feature set in the P3 tests and your checklist' -Phase 'phase-p3-tabs-sessions' `
    -Why 'the new features must keep working, and you check them by hand before signing off.'

Invoke-Step 'The P3 test suite includes the feature set' {
    $pkg = Read-RepoText 'apps/desktop/tests/smoke/package.json' | ConvertFrom-Json
    $p3 = @($pkg.scripts.p3 -split '\s+' | Where-Object { $_ -like '*.spec' })
    foreach ($s in 'bookmarks.spec', 'address-search.spec', 'backup.spec', 'look.spec', 'history.spec') {
        if ($s -notin $p3) { Stop-Fail "npm run p3 does not run $s." }
        if (-not (Test-Path -LiteralPath (Get-RepoPath "apps/desktop/tests/smoke/$s.ts"))) { Stop-Fail "apps/desktop/tests/smoke/$s.ts is missing." }
    }
    $p311 = Read-RepoText 'scripts/verify/p3.11-integration-suite.ps1'
    foreach ($s in 'bookmarks.spec', 'address-search.spec', 'backup.spec', 'look.spec') {
        if ($p311 -notmatch [regex]::Escape("'$s'")) { Stop-Fail "The p3.11 check does not list $s." }
    }
    "npm run p3: $($p3.Count) test files, the feature set's included"
}

Invoke-Step 'Every feature set task has a check script the gate runs' {
    $pj = Read-RepoText 'plan/portal/phases/phase-p3-tabs-sessions.json' | ConvertFrom-Json
    foreach ($id in 'p3.17', 'p3.18', 'p3.19', 'p3.20', 'p3.21', 'p3.22', 'p3.23') {
        $t = $pj.tasks | Where-Object { $_.id -eq $id }
        if (-not $t) { Stop-Fail "Task $id is not in the portal's P3 file." }
        if (-not $t.script) { Stop-Fail "Task $id has no check script." }
        if (-not (Test-Path -LiteralPath (Get-RepoPath $t.script))) { Stop-Fail "$($t.script) is missing." }
    }
    'p3.17 to p3.23: scripts listed and present'
}

Invoke-Step 'Your checklist has the feature set''s items' {
    $c = Read-RepoText 'docs/testing/manual-checklist-p3.md'
    $need = [ordered]@{ '14' = 'split-tile logo'; '15' = 'accent colour'; '16' = 'new tab'; '17' = 'star'; '18' = 'address bar'; '19' = 'Backup and restore'; '20' = 'history' }
    foreach ($k in $need.Keys) {
        $line = ($c -split "`r?`n" | Where-Object { $_ -match "^\| $k \|" } | Select-Object -First 1)
        if (-not $line) { Stop-Fail "Checklist item $k is missing." }
        if ($line -notmatch [regex]::Escape($need[$k])) { Stop-Fail "Checklist item $k does not cover '$($need[$k])'." }
    }
    if ((Read-RepoText 'scripts/gates/p3-gate.ps1') -notmatch 'items 14 to 20') { Stop-Fail 'The P3 gate''s "your part" does not name items 14 to 20.' }
    'items 14 to 20 present; the gate names them'
}

Complete-Check -SaveEvidence:$SaveEvidence
