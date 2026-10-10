#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p0.16 (P0 Planning): Run the full plan-app test gate.

.DESCRIPTION
  What it checks : the plan app's complete check (npm run verify) passes in one run: type check, code
                   style, all unit tests, the wiki check, the production build and all browser tests; and the
                   saved outputs of the first full run exist (IP-9-verify.txt, IP-9-perf.txt,
                   playwright-report.zip, IP-10-final-lint.json).
  Why            : each piece passed on its own → all of them together, in one run, prove the whole app.
  What it changes: nothing in the repo. Browser tests use a temporary sample wiki; ignored folders are written.
  How long       : about 3 to 4 minutes.
  How to run     : pwsh -NoProfile -File scripts/verify/p0.16-plan-app-gate.ps1
                   (close any plan app you started yourself first: the tests use port 3418)
  Result         : PASS = exit 0, FAIL = exit 1, NOT READY = exit 2 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p0.16 check failed".
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p0.16' -Title 'Run the full plan-app test gate' -Phase 'phase-p0-planning' `
    -Why 'all checks together, in one run, prove the whole app works.'

Invoke-Step 'All plan-app checks pass in one run (npm run verify)' {
    $r = Assert-NpmScript 'verify'
    $unit = ($r.Output -split "`r?`n" | Where-Object { $_ -match '^\s+Tests\s+\d+ passed' } | Select-Object -First 1)
    $e2e = ($r.Output -split "`r?`n" | Where-Object { $_ -match '^\s+\d+ passed' } | Select-Object -Last 1)
    "unit: $("$unit".Trim()); browser: $("$e2e".Trim())"
}

Invoke-Step 'The saved outputs of the first full run exist' {
    $dir = 'wiki/raw/evidence/phase-p0-planning/interactive-plan'
    foreach ($f in 'IP-9-verify.txt', 'IP-9-perf.txt', 'playwright-report.zip', 'IP-10-final-lint.json') { [void](Assert-RepoFile "$dir/$f" "Saved output $f") }
    'IP-9-verify.txt, IP-9-perf.txt, playwright-report.zip, IP-10-final-lint.json'
}

Complete-Check -SaveEvidence:$SaveEvidence
