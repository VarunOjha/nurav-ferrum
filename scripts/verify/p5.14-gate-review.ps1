#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p5.14 (P5 Measurement): the exit gate and your M4 review.

.DESCRIPTION
  What it checks : (1) every evidence file the P5 phase page lists exists; (2) your checklist for the review exists;
                   (3) the log has the gate entry for P5; (4) your approval of the P5 exit is recorded.
  Why            : you approve the exit on saved evidence, not on a claim → the gate's files and your checklist are
                   there → only your recorded approval ends P5.
  What it changes: nothing.
  How long       : a few seconds.
  How to run     : pwsh -NoProfile -File scripts/verify/p5.14-gate-review.ps1
  Result         : PASS, FAIL (the line says what) or NOT READY (waiting for your approval).
  Tell Claude    : nothing; Claude runs it after your review.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    The gate itself is scripts/gates/p5-gate.ps1. Phase-page verify field: All evidence files exist; lint clean;
    owner approves phase-p5-telemetry#exit.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p5.14' -Title 'Exit gate and your M4 review' -Phase 'phase-p5-telemetry' `
    -Why 'you approve the exit on saved evidence, not on a claim.'

Invoke-Step 'Every evidence file of the P5 gate exists' {
    $t = (Read-RepoText 'wiki/phases/phase-p5-telemetry.md') -replace "`r`n", "`n"
    $block = [regex]::Match($t, '(?m)^  evidence:\n((?:    - .+\n)+)').Groups[1].Value
    $files = @([regex]::Matches($block, '    - (\S+)') | ForEach-Object { 'wiki/' + $_.Groups[1].Value })
    if ($files.Count -eq 0) { Stop-Fail 'The P5 phase page lists no gate evidence.' }
    $missing = @($files | Where-Object { -not (Test-Path -LiteralPath (Get-RepoPath $_)) } | ForEach-Object { Split-Path -Leaf $_ })
    if ($missing.Count) { Stop-Fail "$($missing.Count) of $($files.Count) missing: $($missing -join ', ')." }
    "$($files.Count) evidence files"
}

Invoke-Step 'Your checklist for the review exists' {
    Assert-RepoFile 'docs/testing/manual-checklist-p5.md'
    'docs/testing/manual-checklist-p5.md'
}

Invoke-Step 'The log has a gate entry for P5' {
    if (-not (Test-LogHeading '\] gate \| phase-p5-telemetry exit')) { Stop-Fail 'No "gate | phase-p5-telemetry exit ..." entry in wiki/log.md yet.' }
    'gate entry found'
}

Invoke-Step 'Your approval of the P5 exit is recorded' {
    Assert-Approved -Keys 'phase-p5-telemetry#exit' -What 'your approval of the P5 exit'
}

Complete-Check -SaveEvidence:$SaveEvidence
