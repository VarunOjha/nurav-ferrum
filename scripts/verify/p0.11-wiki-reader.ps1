#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p0.11 (P0 Planning): Teach the app to read the wiki.

.DESCRIPTION
  What it checks : the plan app's tests for its wiki reader pass (sample pages: valid, missing field, wrong
                   value, hidden byte-order mark, missing last line break), and the real wiki loads with
                   zero page-header errors.
  Why            : the app shows wiki pages → a reader that checks each header flags bad pages instead of
                   showing them wrongly.
  What it changes: nothing. It only reads files.
  How long       : about 15 seconds.
  How to run     : pwsh -NoProfile -File scripts/verify/p0.11-wiki-reader.ps1
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p0.11 check failed".
  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). Wiki rules FM-MISSING, FM-ENUM, FM-TYPE-DIR, FILE-ENCODING.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p0.11' -Title 'Teach the app to read the wiki' -Phase 'phase-p0-planning' `
    -Why 'bad pages must be flagged, not shown wrongly.'

Invoke-Step 'Wiki reader tests pass on the sample pages' {
    $r = Assert-NpmScript 'test' -Extra @('tests/unit/load.test.ts', 'tests/unit/frontmatter.test.ts', 'tests/unit/schemas.test.ts')
    $line = ($r.Output -split "`r?`n" | Where-Object { $_ -match '^\s+Tests\s' } | Select-Object -Last 1)
    "reader tests: $($line.Trim())"
}

Invoke-Step 'The real wiki loads with zero header errors' {
    Assert-NoLintErrors -Report (Get-WikiLint) -Codes 'FM-MISSING', 'FM-ENUM', 'FM-TYPE-DIR', 'FILE-ENCODING'
    'FM-MISSING, FM-ENUM, FM-TYPE-DIR, FILE-ENCODING: 0 errors'
}

Complete-Check -SaveEvidence:$SaveEvidence
