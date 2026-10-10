#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p0.13 (P0 Planning): Build the app's views and wiki check.

.DESCRIPTION
  What it checks : the browser tests open every view of the plan app (dashboard, roadmap, architecture,
                   decisions, risks, research, wiki pages) on a production build and find the expected parts
                   and no page errors; the wiki check itself runs and reports zero errors.
  Why            : you need to see the plan, not raw files → readable views plus an automatic wiki check.
  What it changes: nothing in the repo. The browser tests work on a temporary copy of a small sample wiki
                   and only write ignored folders (interactive_plan/.next, test-results, playwright-report).
  How long       : about 1 minute.
  How to run     : pwsh -NoProfile -File scripts/verify/p0.13-plan-app-views.ps1
                   (close any plan app you started yourself first: the tests use ports 3418-3420)
  Result         : PASS = exit 0, FAIL = exit 1, NOT READY = exit 2 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p0.13 check failed".
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p0.13' -Title "Build the app's views and wiki check" -Phase 'phase-p0-planning' `
    -Why 'the plan must be readable in views, and checked automatically.'

Invoke-Step 'Browser tests open every view without errors' {
    $specs = 'views.spec', 'dashboard.spec', 'roadmap.spec', 'architecture.spec', 'decisions.spec', 'risks.spec', 'research.spec', 'wiki.spec'
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
