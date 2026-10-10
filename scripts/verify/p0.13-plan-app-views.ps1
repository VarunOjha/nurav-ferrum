#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p0.13 (P0 Planning): Build the app's views and wiki check.

.DESCRIPTION
  What it checks : the browser tests open the portal on a production build: every tab, the Overview with
                   its phase popups, and the reference popups, with no page errors; the wiki check itself
                   runs and reports zero errors. The first app's wiki-browser views were replaced by the
                   read-only portal in task p0.17 (2026-10-09), so this check now covers the portal views.
  Why            : you need to see the plan, not raw files → readable views plus an automatic wiki check.
  What it changes: nothing in the repo. The browser tests only read plan/ (they fail if any file there
                   changes) and write ignored folders only (interactive_plan/.next, test-results, playwright-report).
  How long       : about 1 minute.
  How to run     : pwsh -NoProfile -File scripts/verify/p0.13-plan-app-views.ps1
                   (close any plan app you started yourself first: the tests use port 3418)
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p0.13 check failed".
  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p0.13' -Title "Build the app's views and wiki check" -Phase 'phase-p0-planning' `
    -Why 'the plan must be readable in views, and checked automatically.'

Invoke-Step 'Browser tests open every view without errors' {
    $specs = 'shell.spec', 'overview.spec', 'refs.spec'
    $r = Assert-NpmScript 'test:e2e' -Extra $specs
    $line = ($r.Output -split "`r?`n" | Where-Object { $_ -match '^\s+\d+ passed' } | Select-Object -Last 1)
    "browser tests: $($line.Trim())"
}

Invoke-Step 'The wiki check runs and reports zero errors' {
    $lint = Get-WikiLint
    Assert-NoLintErrors -Report $lint
    "$($lint.rules.Count) rules over $($lint.summary.pages) pages: 0 errors"
}

Complete-Check -SaveEvidence:$SaveEvidence
