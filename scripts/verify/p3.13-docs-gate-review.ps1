#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.13 (P3 Tabs and sessions): Docs, the P3 gate, and your review.

.DESCRIPTION
  What it checks : (1) the docs describe P3: README (status, how to use tabs and the shortcuts, known limitations),
                   SECURITY.md (what P3 adds), the P3 manual checklist, and the three part pages carry an
                   "Implementation status (P3)" section; (2) every automatic evidence file of the P3 gate exists
                   (the gate saves them); (3) the log has a gate entry for P3; (4) your checklist answers are saved
                   (manual-checklist.md) and (5) your approval of the P3 exit is recorded. Until you have done your
                   part, (4) and (5) say WAIT.
  Why            : you approve the exit on saved evidence, not on a claim → the docs, the gate's outputs and your
                   own hands-on results are all in the project → P3 can be signed off.
  What it changes: nothing.
  How long       : about 2 seconds.
  How to run     : pwsh -NoProfile -File scripts/verify/p3.13-docs-gate-review.ps1
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits: your checklist or your sign-off).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p3.13 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). Phase-page verify field:
    All evidence files exist; lint clean; owner approves phase-p3-tabs-sessions#exit.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p3.13' -Title 'Docs, the P3 gate, and your review' -Phase 'phase-p3-tabs-sessions' `
    -Why 'you approve the exit on saved evidence, not on a claim.'

Invoke-Step 'The docs describe P3' {
    $readme = Read-RepoText 'README.md'
    foreach ($need in 'phase P3', 'Using Ferrum (P3)', 'Known limitations of P3', 'manual-checklist-p3.md') {
        if ($readme -notmatch [regex]::Escape($need)) { Stop-Fail "README.md does not mention '$need'." }
    }
    if ((Read-RepoText 'SECURITY.md') -notmatch 'What P3 \(M2, tabs and sessions\) adds') { Stop-Fail 'SECURITY.md has no P3 section.' }
    Assert-RepoFile 'docs/testing/manual-checklist-p3.md'
    foreach ($c in 'comp-app-shell', 'comp-core', 'comp-webview-manager') {
        if ((Read-RepoText "wiki/architecture/components/$c.md") -notmatch '## Implementation status \(P3') { Stop-Fail "$c has no P3 implementation section." }
    }
    'README, SECURITY.md, the P3 checklist and three part pages'
}

$t = (Read-RepoText 'wiki/phases/phase-p3-tabs-sessions.md') -replace "`r`n", "`n"
$block = [regex]::Match($t, '(?m)^  evidence:\n((?:    - .+\n)+)').Groups[1].Value
$files = @([regex]::Matches($block, '    - (\S+)') | ForEach-Object { 'wiki/' + $_.Groups[1].Value })

Invoke-Step 'Every automatic evidence file of the P3 gate exists' {
    $auto = @($files | Where-Object { $_ -notmatch 'manual-checklist' })
    if ($auto.Count -eq 0) { Stop-Fail 'The P3 phase page lists no gate evidence.' }
    $missing = @($auto | Where-Object { -not (Test-Path -LiteralPath (Get-RepoPath $_)) } | ForEach-Object { Split-Path -Leaf $_ })
    if ($missing.Count) { Stop-Fail "$($missing.Count) of $($auto.Count) missing: $($missing -join ', '). Run scripts/gates/p3-gate.ps1 -SaveEvidence." }
    "$($auto.Count) evidence files"
}

Invoke-Step 'The log has a gate entry for P3' {
    if (-not (Test-LogHeading '\] gate \| phase-p3-tabs-sessions exit')) { Stop-Fail 'No "gate | phase-p3-tabs-sessions exit" entry in wiki/log.md yet.' }
    'gate entry found'
}

Invoke-Step 'Your checklist answers are saved' {
    $manual = @($files | Where-Object { $_ -match 'manual-checklist' })
    $missing = @($manual | Where-Object { -not (Test-Path -LiteralPath (Get-RepoPath $_)) })
    if ($missing.Count) { Stop-Wait 'Your answers to docs/testing/manual-checklist-p3.md are not saved yet (Claude saves them from your words).' }
    'manual-checklist.md saved'
}

Invoke-Step 'Your approval of the P3 exit is recorded' {
    Assert-Approved -Keys 'phase-p3-tabs-sessions#exit' -What 'your approval of the P3 exit'
}

Complete-Check -SaveEvidence:$SaveEvidence
