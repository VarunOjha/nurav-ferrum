#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p4.11 (P4 Security): the security test suite.

.DESCRIPTION
  What it checks : (1) the security testing page has the table "master prompt item -> test ids" for all ten items, and
                   every spec file and Rust test it names exists; (2) the one-command suite
                   (scripts/security-suite.ps1) runs and passes, including the allowlist cases and the new
                   cross-origin test (item 4); its result is saved as security-suite.txt.
  Why            : every security area needs a test → one command runs them all and a table says which test covers
                   which area → anyone can rerun the whole suite after a change.
  What it changes: nothing (the suite builds in target/debug and target/security-static; test data in the smoke-test
                   folder and the temp folder).
  How long       : about fifteen minutes (it runs the whole suite).
  How to run     : pwsh -NoProfile -File scripts/verify/p4.11-security-test-suite.ps1
  Result         : PASS (every checked step is fine) or FAIL (the line says what).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p4.11 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    Do not use the PC while it runs. With -SaveEvidence the suite saves its own result too. Phase-page verify field:
    One command runs the suite and exits 0; the suite includes the allowlist cases (override of a blocklist rule,
    allowlist-only mode denying a non-listed host); a mapping table (item to test id) is on the security quality page.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p4.11' -Title 'Security test suite' -Phase 'phase-p4-security' `
    -Why 'anyone can rerun the whole suite after a change.'

Invoke-Step 'The item -> test table on the security testing page names tests that exist' {
    $page = Read-RepoText 'wiki/quality/qual-security-testing-plan.md'
    $table = ($page -split '## 5\. Traceability')[1] -split '## 6\.' | Select-Object -First 1
    foreach ($n in 1..10) {
        if ($table -notmatch "(?m)^\| $n [A-Z]") { Stop-Fail "Item $n has no row in the table." }
    }
    $specs = @([regex]::Matches($table, '`([a-z-]+)\.spec`') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique)
    foreach ($s in $specs) { Assert-RepoFile "apps/desktop/tests/smoke/$s.spec.ts" }
    $policy = Read-RepoText 'crates/security/src/policy.rs'
    $rust = @([regex]::Matches($table, 'Rust `([a-z_]+)`|, `([a-z_]+)` and the rest') | ForEach-Object { $_.Groups[1].Value + $_.Groups[2].Value })
    foreach ($t in $rust) { if ($policy -notmatch "fn $t\(") { Stop-Fail "Rust test $t is named in the table but does not exist." } }
    "10 items; $($specs.Count) spec files and $($rust.Count) named Rust tests exist"
}

Invoke-Step 'One command runs the whole suite and passes' {
    $suiteArgs = if ($SaveEvidence) { @('-SaveEvidence') } else { @() }
    $r = Invoke-ChildScript 'scripts/security-suite.ps1' -ArgumentList $suiteArgs
    Add-LogText (($r.Output -split "`r?`n" | Where-Object { $_ -match '^\s+(PASS|FAIL)|^RESULT|^\s{9}\S|Evidence saved' }) -join "`n")
    if ($r.ExitCode -ne 0) { Stop-Fail "The suite did not pass:`n$(Get-Tail $r.Output 30)" }
    ($r.Output -split "`r?`n" | Where-Object { $_ -match '^RESULT' } | Select-Object -First 1)
}

Complete-Check -SaveEvidence:$SaveEvidence
