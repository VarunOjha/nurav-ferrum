#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p1.10 (P1 Foundation): Re-confirm the history-based wiki checks.

.DESCRIPTION
  What it checks : the wiki check's two history-based rules (a raw file was changed; a page changed without
                   its date being updated) are caught on small sample repositories in the plan app's tests;
                   the real wiki has zero errors; every raw file still matches its recorded fingerprint and
                   every raw file has one.
                   Note: these rules were already built in P0, so this check passes before P1 starts. That is
                   expected: in P1 the task only re-runs it on the new history (one less real build task).
  Why            : raw files must never change and pages must stay dated → tampering or stale dates are caught
                   by the one existing wiki check, not a second checker.
  What it changes: nothing in the repo. The tests create temporary sample repositories and delete them.
  How long       : about 20 seconds.
  How to run     : pwsh -NoProfile -File scripts/verify/p1.10-history-wiki-checks.ps1
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p1.10 check failed".
  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p1.10' -Title 'Re-confirm the history-based wiki checks' -Phase 'phase-p1-foundation' `
    -Why 'raw-file tampering and stale page dates must be caught.'

Invoke-Step 'Sample repositories trigger both history rules' {
    $r = Assert-NpmScript 'test' -Extra @('tests/unit/lint-git.test.ts', 'tests/unit/lint-git-sanctioned.test.ts')
    $line = ($r.Output -split "`r?`n" | Where-Object { $_ -match '^\s+Tests\s' } | Select-Object -Last 1)
    "history rule tests: $($line.Trim())"
}

Invoke-Step 'The real wiki has zero errors' {
    $lint = Get-WikiLint
    Assert-NoLintErrors -Report $lint
    "$($lint.summary.pages) pages, 0 errors (RAW-IMMUTABLE and STALE-UPDATED included)"
}

Invoke-Step 'Every raw file has a fingerprint, and all still match' {
    $manifest = Get-ManifestEntries
    $rawDir = Get-RepoPath 'wiki/raw'
    $bad = @(foreach ($f in Get-ChildItem -LiteralPath $rawDir -Recurse -File | Where-Object { $_.Name -ne 'MANIFEST.sha256' }) {
        $rel = [IO.Path]::GetRelativePath($rawDir, $f.FullName).Replace('\', '/')
        if (-not $manifest.ContainsKey($rel)) { "no fingerprint line: $rel" }
        elseif ((Get-ContentHash "wiki/raw/$rel").Substring(7) -ne $manifest[$rel]) { "changed: $rel" }
    })
    if ($bad.Count) { Stop-Fail ($bad -join "`n") }
    "$($manifest.Count) fingerprints match"
}

Complete-Check -SaveEvidence:$SaveEvidence
