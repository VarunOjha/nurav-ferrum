#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p0.8 (P0 Planning): Check the whole wiki.

.DESCRIPTION
  What it checks : the full wiki check reports zero errors; the quick Python check
                   reports zero errors; every raw file under wiki/raw/ has a fingerprint line in
                   wiki/raw/MANIFEST.sha256 and still matches it; the first check report
                   (wiki-lint-manual.md) and a "lint" log entry exist.
  Why            : hundreds of linked pages drift → a clean check plus fingerprints of every raw file
                   means work starts from a clean, tamper-evident base.
  What it changes: nothing. It only reads files (unless you add -SaveEvidence).
  How long       : about 8 seconds.
  How to run     : pwsh -NoProfile -File scripts/verify/p0.8-wiki-check.ps1
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p0.8 check failed".
  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). Quick check: tools/quick_lint.py.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p0.8' -Title 'Check the whole wiki' -Phase 'phase-p0-planning' `
    -Why 'a clean check and fingerprinted raw files give a tamper-evident base.'

Invoke-Step 'Full wiki check: zero errors' {
    $lint = Get-WikiLint
    Assert-NoLintErrors -Report $lint
    "$($lint.summary.pages) pages: $($lint.summary.errors) errors, $($lint.summary.warnings) warnings (reviewed in the log), $($lint.summary.info) info"
}

Invoke-Step 'Quick Python check: zero errors' {
    $r = Invoke-Native -FilePath 'python' -ArgumentList @('tools/quick_lint.py')
    if ($r.ExitCode -ne 0) { Stop-Fail "tools/quick_lint.py reported errors:`n$(Get-Tail $r.Output 8)" }
    (Get-Tail $r.Output 1)
}

Invoke-Step 'Every raw file has a fingerprint, and all still match' {
    $manifest = Get-ManifestEntries
    $rawDir = Get-RepoPath 'wiki/raw'
    $files = @(Get-ChildItem -LiteralPath $rawDir -Recurse -File | Where-Object { $_.Name -ne 'MANIFEST.sha256' })
    $problems = foreach ($f in $files) {
        $rel = [IO.Path]::GetRelativePath($rawDir, $f.FullName).Replace('\', '/')
        if (-not $manifest.ContainsKey($rel)) { "no fingerprint line: $rel"; continue }
        if ((Get-ContentHash "wiki/raw/$rel").Substring(7) -ne $manifest[$rel]) { "changed: $rel" }
    }
    $gone = @($manifest.Keys | Where-Object { -not (Test-Path -LiteralPath (Join-Path $rawDir $_)) } | ForEach-Object { "listed but missing: $_" })
    $all = @($problems) + $gone
    if ($all.Count) { Stop-Fail ($all -join "`n") }
    "$($files.Count) raw files, all match"
}

Invoke-Step 'The first check report and a check log entry exist' {
    [void](Assert-RepoFile 'wiki/raw/evidence/phase-p0-planning/wiki-lint-manual.md' 'The first wiki check report')
    if (-not (Test-LogHeading '\] lint \|')) { Stop-Fail 'wiki/log.md has no "lint" entry.' }
    'wiki-lint-manual.md and a lint log entry'
}

Complete-Check -SaveEvidence:$SaveEvidence
