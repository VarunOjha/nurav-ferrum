#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p2.18 (P2 First working app): Run the gate; your review.

.DESCRIPTION
  What it checks : every evidence file the P2 phase page lists exists (the gate saves them, and Claude saves your
                   manual checklist answers); the log has a gate entry for P2; your approval of the P2 exit is
                   recorded. Until you have reviewed P2 this ends NOT READY, which is expected.
  Why            : all tasks done → run every check and save the output → you try the release build and approve
                   the first milestone on saved evidence, not on a claim.
  What it changes: nothing.
  How long       : a few seconds.
  How to run     : pwsh -NoProfile -File scripts/verify/p2.18-run-gate-review.ps1
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits, usually your review).
  Tell Claude    : nothing; Claude runs it after your review.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). Phase-page verify field: all evidence files exist; lint clean
                   (the gate's wiki check); owner approves phase-p2-minimal-container#exit.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p2.18' -Title 'Run the gate; your review' -Phase 'phase-p2-minimal-container' `
    -Why 'you approve the exit on saved evidence, not on a claim.'

Invoke-Step 'Every evidence file of the P2 gate exists' {
    $t = (Read-RepoText 'wiki/phases/phase-p2-minimal-container.md') -replace "`r`n", "`n"
    $block = [regex]::Match($t, '(?m)^  evidence:\n((?:    - .+\n)+)').Groups[1].Value
    $files = @([regex]::Matches($block, '    - (\S+)') | ForEach-Object { 'wiki/' + $_.Groups[1].Value })
    if ($files.Count -eq 0) { Stop-Fail 'The P2 phase page lists no gate evidence.' }
    $missing = @($files | Where-Object { -not (Test-Path -LiteralPath (Get-RepoPath $_)) } | ForEach-Object { Split-Path -Leaf $_ })
    if ($missing.Count) { Stop-Fail "$($missing.Count) of $($files.Count) missing: $($missing -join ', ')." }
    "$($files.Count) evidence files"
}

Invoke-Step 'The log has a gate entry for P2' {
    if (-not (Test-LogHeading '\] gate \| phase-p2-minimal-container')) { Stop-Fail 'No "gate | phase-p2-minimal-container" entry in wiki/log.md yet.' }
    'gate entry found'
}

Invoke-Step 'Your approval of the P2 exit is recorded' {
    Assert-Approved -Keys 'phase-p2-minimal-container#exit' -What 'your approval of the P2 exit'
}

Complete-Check -SaveEvidence:$SaveEvidence
