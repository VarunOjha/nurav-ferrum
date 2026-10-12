#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.11 (P3 Tabs and sessions): The P3 test suite in one command.

.DESCRIPTION
  What it checks : the P3 integration suite runs in one command and passes: the Rust unit tests of the P3 parts (tab
                   rules, shortcuts, settings file, session, per-site profiles, history) and the app tests of p3.2 to
                   p3.9, p3.14 and p3.15 (npm run p3 in apps/desktop/tests/smoke: tabs, shortcuts, startup, restore,
                   profiles, history, downloads, responsive, no-freeze, settings, sidebar). With -SaveEvidence the whole
                   app-test output is also saved (p3.11-suite.txt).
  Why            : each task proved its own part → one command proves them all together on one build → the P3 gate
                   and any later change can re-run everything at once.
  What it changes: nothing in git.
  How long       : about 3 minutes after the first build. Some tests press real keys: Ferrum comes to the front for a
                   few seconds at a time; please do not type meanwhile.
  How to run     : pwsh -NoProfile -File scripts/verify/p3.11-integration-suite.ps1
                   (the app tests alone: cd apps/desktop/tests/smoke; npm run p3)
                   Needs the local development certificate (task p2.1) and ports 8443 and 9339 free.
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p3.11 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1, scripts/lib/Ferrum.SelfTest.ps1). Phase-page verify field:
    One command runs the suite and exits 0; output saved.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p3.11' -Title 'The P3 test suite in one command' -Phase 'phase-p3-tabs-sessions' `
    -Why 'the P3 gate and any later change can re-run everything at once.'

# The P3 app tests, in the order of the tasks (the same list as "npm run p3").
$specs = @('tabs.spec', 'shortcuts.spec', 'startup.spec', 'restore.spec', 'profiles.spec', 'history.spec', 'downloads.spec',
    'responsive.spec', 'no-freeze.spec', 'settings.spec', 'sidebar.spec',
    # The new small feature set (p3.19 to p3.22, added 2026-10-12).
    'bookmarks.spec', 'address-search.spec', 'backup.spec', 'look.spec')

Invoke-Step 'Rust unit tests of the P3 parts' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-core', '--test', 'tabs', '--test', 'shortcuts', '--test', 'config',
        '--test', 'session', '--test', 'profiles', '--test', 'history')
    $passed = ([regex]::Matches($r.Output, 'test result: ok\. (\d+) passed') | ForEach-Object { [int]$_.Groups[1].Value } | Measure-Object -Sum).Sum
    "ferrum-core P3 tests: $passed passed"
}

Invoke-Step 'App tests of p3.2 to p3.9, p3.14 and p3.15 (npm run p3)' {
    $pkg = Read-RepoText 'apps/desktop/tests/smoke/package.json' | ConvertFrom-Json
    $listed = @($pkg.scripts.p3 -split '\s+' | Where-Object { $_ -like '*.spec' })
    if ((Compare-Object $listed $specs)) { Stop-Fail "npm run p3 lists other tests than this check: $($listed -join ' ')" }
    $r = Invoke-FerrumSmoke -Spec $specs
    if ($SaveEvidence) {
        $text = "P3 integration suite (npm run p3), saved by scripts/verify/p3.11-integration-suite.ps1 at commit $(Get-GitCommit)`nExit code: $($r.ExitCode)`n`n$($r.Output)"
        Write-Note ("saved " + (Save-Evidence -Path 'wiki/raw/evidence/phase-p3-tabs-sessions/p3.11-suite.txt' -Text $text))
    }
    Add-LogText (Get-Tail $r.Output 4)
    if ($r.Output -match 'was not the active window') { Stop-Wait 'Ferrum was not the active window when keys were due; run the check again without using the PC meanwhile.' }
    $summary = ([regex]::Match($r.Output, '(\d+) passed')).Value
    if ($r.ExitCode -ne 0 -or $r.Output -match '\d+ failed') { Stop-Fail "The suite failed:`n$(Get-Tail $r.Output 20)" }
    "npm run p3: $summary"
}

Complete-Check -SaveEvidence:$SaveEvidence
