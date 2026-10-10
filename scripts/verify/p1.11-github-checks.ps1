#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p1.11 (P1 Foundation): Turn on automatic checks on GitHub.

.DESCRIPTION
  What it checks : the GitHub workflow file (.github/workflows/ci.yml) exists, runs on Windows and contains
                   the Rust checks (formatting, code warnings, tests, licences), the plan-app checks and the
                   wiki check; the local script that runs the same checks (scripts/ci-local.ps1) finishes
                   cleanly on this computer. The GitHub run itself is yours: Claude never pushes.
  Why            : mistakes are cheaper caught at once → one GitHub workflow and one local script running the
                   same checks test every change the same way.
  What it changes: nothing in the repo. The local script builds into ignored folders.
  How long       : as long as scripts/ci-local.ps1 (several minutes).
  How to run     : pwsh -NoProfile -File scripts/verify/p1.11-github-checks.ps1
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : if it passes, push when you are ready and tell Claude "GitHub checks: passed" or paste the
                   failure; or say "defer GitHub". If it fails, paste the FAIL lines.
  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p1.11' -Title 'Turn on automatic checks on GitHub' -Phase 'phase-p1-foundation' `
    -Why 'every change is tested the same way, locally and on GitHub.'

Invoke-Step 'The GitHub workflow runs on Windows and lists every check' {
    $t = Read-RepoText '.github/workflows/ci.yml'
    if ($t -notmatch 'runs-on:\s*windows-latest') { Stop-Fail 'ci.yml does not run on windows-latest.' }
    $need = [ordered]@{ 'formatting' = 'cargo fmt'; 'code warnings' = 'cargo clippy'; 'tests' = 'cargo test'; 'licences' = 'cargo deny'
        'plan app' = 'npm run (lint|typecheck|test|build)'; 'wiki check' = 'lint:wiki' }
    $missing = @($need.Keys | Where-Object { $t -notmatch $need[$_] })
    if ($missing.Count) { Stop-Fail "ci.yml lacks: $($missing -join ', ')." }
    'windows-latest; all checks listed'
}

Invoke-Step 'The local check script passes' {
    [void](Assert-RepoFile 'scripts/ci-local.ps1' 'The local check script')
    $r = Invoke-ChildScript 'scripts/ci-local.ps1'
    if ($r.ExitCode -ne 0) { Stop-Fail "scripts/ci-local.ps1 failed (exit $($r.ExitCode)):`n$(Get-Tail $r.Output 10)" }
    'scripts/ci-local.ps1: exit 0'
}

Add-YourStep 'GitHub run' 'Create the GitHub repository if needed, push, and tell Claude the result of the "ci" run (or say "defer GitHub").'

Complete-Check -SaveEvidence:$SaveEvidence
