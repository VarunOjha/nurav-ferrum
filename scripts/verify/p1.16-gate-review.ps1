#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p1.16 (P1 Foundation): Run the gate; your review.

.DESCRIPTION
  What it checks : every evidence file the P1 gate needs exists (toolchain, machine inventory, the Rust check
                   outputs, licence check, wiki check, local check script, the four experiment reports); the
                   wiki log has a "gate" entry for P1; your approval of the P1 exit is recorded.
                   The checks themselves are run by the gate script: scripts/gates/p1-gate.ps1 -SaveEvidence.
  Why            : all tasks done → every check runs on one commit and is saved → you review the experiment
                   evidence and approve the exit.
  What it changes: nothing. It only reads files.
  How long       : about 2 seconds.
  How to run     : pwsh -NoProfile -File scripts/verify/p1.16-gate-review.ps1
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p1.16 check failed".
  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p1.16' -Title 'Run the gate; your review' -Phase 'phase-p1-foundation' `
    -Why 'you approve the exit on saved evidence, not on a claim.'

Invoke-Step 'Every evidence file of the P1 gate exists' {
    $t = (Read-RepoText 'wiki/phases/phase-p1-foundation.md') -replace "`r`n", "`n"
    $block = [regex]::Match($t, '(?m)^  evidence:\n((?:    - .+\n)+)').Groups[1].Value
    $files = @([regex]::Matches($block, '    - (\S+)') | ForEach-Object { 'wiki/' + $_.Groups[1].Value })
    if ($files.Count -eq 0) { Stop-Fail 'The P1 phase page lists no gate evidence.' }
    $missing = @($files | Where-Object { -not (Test-Path -LiteralPath (Get-RepoPath $_)) } | ForEach-Object { Split-Path -Leaf $_ })
    if ($missing.Count) { Stop-Fail "$($missing.Count) of $($files.Count) missing: $($missing -join ', ')." }
    "$($files.Count) evidence files"
}

Invoke-Step 'The log has a gate entry for P1' {
    if (-not (Test-LogHeading '\] gate \| phase-p1-foundation')) { Stop-Fail 'No "gate | phase-p1-foundation" entry in wiki/log.md yet.' }
    'gate entry found'
}

Invoke-Step 'Your approval of the P1 exit is recorded' {
    Assert-Approved -Keys 'phase-p1-foundation#exit' -What 'your approval of the P1 exit'
}

Complete-Check -SaveEvidence:$SaveEvidence
