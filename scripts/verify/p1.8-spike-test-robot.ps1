#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p1.8 (P1 Foundation): Experiment 4, test robot drives the app.

.DESCRIPTION
  What it checks : the test-robot experiment (spikes/s4-playwright-cdp) produced its list of every view it
                   could see (targets.json, at least the app's own window plus one website view), and its
                   report (spike-s4-playwright-cdp.md) says which robot features did not work. With -Run it
                   also runs the robot again ("npm run check" in that folder), which must finish cleanly.
  Why            : benchmarks drive browsers with a test robot (Playwright) through a debugging channel →
                   connecting to the experiment app, Chrome and Edge the same way gives one fair harness.
  What it changes: nothing without -Run. With -Run the robot starts the experiment app on this computer and
                   rewrites its own targets.json.
  How long       : about 2 seconds; with -Run about 1 minute.
  How to run     : pwsh -NoProfile -File scripts/verify/p1.8-spike-test-robot.ps1 [-Run]
  Result         : PASS = exit 0, FAIL = exit 1, NOT READY = exit 2 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p1.8 check failed".
#>
[CmdletBinding()]
param([switch]$SaveEvidence, [switch]$Run)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p1.8' -Title 'Experiment 4: test robot drives the app' -Phase 'phase-p1-foundation' `
    -Why 'one robot driving every product the same way keeps the benchmark fair.'

$folder = 'spikes/s4-playwright-cdp'
$report = 'wiki/raw/evidence/phase-p1-foundation/spike-s4-playwright-cdp.md'

if ($Run) {
    Invoke-Step 'The robot runs again and finishes cleanly' {
        [void](Assert-RepoFile "$folder/package.json" 'The test-robot experiment')
        [void](Assert-NpmScript 'check' -Folder $folder)
        'npm run check: exit 0'
    }
}

Invoke-Step 'The robot listed every view it could see' {
    $targets = @(Read-RepoText "$folder/targets.json" | ConvertFrom-Json)
    if ($targets.Count -lt 2) { Stop-Fail "targets.json lists $($targets.Count) view(s); expected the app window plus at least one website view." }
    "$($targets.Count) views listed"
}

Invoke-Step 'The report reads paint timing and says what did not work' {
    $t = Read-RepoText $report
    if ($t -notmatch '(?i)paint') { Stop-Fail 'The report does not show paint timing read from a local page.' }
    if ($t -notmatch '(?im)^#+ .*(did not work|failed|unsupported)') { Stop-Fail 'The report has no section on robot features that did not work.' }
    'paint timing and failures section present'
}

Complete-Check -SaveEvidence:$SaveEvidence
