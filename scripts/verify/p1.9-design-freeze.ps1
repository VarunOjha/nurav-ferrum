#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p1.9 (P1 Foundation): Decide the design from the experiments.

.DESCRIPTION
  What it checks : new decision pages exist that cite the experiment reports (expected: the profile route,
                   back/forward, and the benchmark connection path); each risk the experiments tested cites its
                   report (profile risk → experiment 2, multi-view risk → experiment 1, low-level calls risk →
                   experiment 3, test-robot risk → experiment 4); and your approval of the new decisions is
                   recorded (you approve in Claude Code; Claude records it).
  Why            : four experiment verdicts → the design is settled by you before P2 and P3 are revised.
  What it changes: nothing. It only reads files.
  How long       : about 2 seconds.
  How to run     : pwsh -NoProfile -File scripts/verify/p1.9-design-freeze.ps1
  Result         : PASS = exit 0, FAIL = exit 1, NOT READY = exit 2 (scripts/lib/Ferrum.Check.psm1).
                   It ends NOT READY while it only waits for your approval.
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p1.9 check failed".
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p1.9' -Title 'Decide the design from the experiments' -Phase 'phase-p1-foundation' `
    -Why 'you settle the design from evidence before P2 starts.'

$script:NewAdrs = @()

Invoke-Step 'New decision pages cite the experiment reports' {
    $script:NewAdrs = @(Get-ChildItem -LiteralPath (Get-RepoPath 'wiki/decisions') -Filter 'adr-*.md' |
        Where-Object { (Read-RepoText "wiki/decisions/$($_.Name)") -match 'evidence/phase-p1-foundation/spike-s[1-4]' } |
        ForEach-Object { (Get-Frontmatter "wiki/decisions/$($_.Name)")['id'] })
    if ($script:NewAdrs.Count -eq 0) { Stop-Fail 'No decision page cites an experiment report yet.' }
    "$($script:NewAdrs.Count) decision page(s): $($script:NewAdrs -join ', ')"
}

Invoke-Step 'Each tested risk cites its experiment report' {
    $map = [ordered]@{ 'risk-r01' = 'spike-s2'; 'risk-r02' = 'spike-s1'; 'risk-r03' = 'spike-s3'; 'risk-r06' = 'spike-s4' }
    $missing = @(foreach ($r in $map.Keys) {
        $file = @(Get-ChildItem -LiteralPath (Get-RepoPath 'wiki/risks') -Filter "$r-*.md")[0]
        if ((Read-RepoText "wiki/risks/$($file.Name)") -notmatch [regex]::Escape($map[$r])) { "$r (needs $($map[$r]))" }
    })
    if ($missing.Count) { Stop-Fail "Not updated yet: $($missing -join ', ')." }
    '4 risks cite their reports'
}

Invoke-Step 'Your approval of the new decisions is recorded' {
    if ($script:NewAdrs.Count -eq 0) { Stop-Fail 'There are no new decision pages to approve yet.' }
    Assert-Approved -Keys $script:NewAdrs -What 'your approval of the new decisions'
}

Complete-Check -SaveEvidence:$SaveEvidence
