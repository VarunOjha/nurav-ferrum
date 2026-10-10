#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p1.13 (P1 Foundation): Start the public docs.

.DESCRIPTION
  What it checks : the starter documents exist (SECURITY.md, BENCHMARKING.md, REPRODUCIBILITY.md,
                   docs/README.md and AI_USAGE.md), each links to at least one wiki page, and every relative
                   link in them points to a file that exists; the wiki check has no broken links.
  Why            : readers need security, benchmark and reproducibility notes → short starter files linking to
                   the wiki let the documentation grow with the code.
  What it changes: nothing. It only reads files.
  How long       : about 6 seconds.
  How to run     : pwsh -NoProfile -File scripts/verify/p1.13-public-docs.ps1
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p1.13 check failed".
  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p1.13' -Title 'Start the public docs' -Phase 'phase-p1-foundation' `
    -Why 'documentation grows with the code and points to the wiki.'

$docs = 'SECURITY.md', 'BENCHMARKING.md', 'REPRODUCIBILITY.md', 'docs/README.md', 'AI_USAGE.md'

Invoke-Step 'The starter documents exist' {
    $missing = @($docs | Where-Object { -not (Test-Path -LiteralPath (Get-RepoPath $_)) })
    if ($missing.Count) { Stop-Fail "Missing: $($missing -join ', ')." }
    $docs -join ', '
}

Invoke-Step 'Each links to the wiki, and no link is broken' {
    $problems = @(foreach ($d in $docs) {
        $t = Read-RepoText $d
        if ($t -notmatch '\]\([^)]*wiki/') { "$d has no link to a wiki page" }
        $base = Split-Path -Parent (Get-RepoPath $d)
        foreach ($m in [regex]::Matches($t, '\]\(([^)#\s]+)(#[^)]*)?\)')) {
            $target = $m.Groups[1].Value
            if ($target -match '^(https?|mailto):') { continue }
            if (-not (Test-Path -LiteralPath (Join-Path $base $target))) { "$d links to a missing file: $target" }
        }
    })
    if ($problems.Count) { Stop-Fail ($problems -join "`n") }
    'all links resolve'
}

Invoke-Step 'Wiki check: no broken links' {
    Assert-NoLintErrors -Report (Get-WikiLint) -Codes 'REF-DANGLING'
    'REF-DANGLING: 0 errors'
}

Complete-Check -SaveEvidence:$SaveEvidence
