#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p0.7 (P0 Planning): Write phase pages, index and log.

.DESCRIPTION
  What it checks : the nine phase pages P0 to P8 exist in order; the index (wiki/index.md) lists every page
                   once; every log heading in wiki/log.md has the agreed form
                   "## [date] kind | title"; the phases are in a consistent order.
  Why            : work spans nine phases and many sessions → a page per phase, an index of every page
                   and a running log let you and Claude find anything.
  What it changes: nothing. It only reads files (unless you add -SaveEvidence).
  How long       : about 6 seconds (it runs the wiki check of the plan app).
  How to run     : pwsh -NoProfile -File scripts/verify/p0.7-phases-index-log.ps1
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p0.7 check failed".
  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). Wiki rules INDEX-MISSING, LOG-FORMAT, PHASE-ORDER.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p0.7' -Title 'Write phase pages, index and log' -Phase 'phase-p0-planning' `
    -Why 'a page per phase, an index and a log let anyone find anything.'

Invoke-Step 'Nine phase pages, P0 to P8, in order' {
    $pages = @(Get-ChildItem -LiteralPath (Get-RepoPath 'wiki/phases') -Filter 'phase-p*.md' | Sort-Object Name)
    if ($pages.Count -ne 9) { Stop-Fail "Expected 9 phase pages, found $($pages.Count)." }
    for ($i = 0; $i -lt 9; $i++) {
        $fm = Get-Frontmatter "wiki/phases/$($pages[$i].Name)"
        if ($fm['order'] -ne "$i") { Stop-Fail "$($pages[$i].Name) has order '$($fm['order'])', expected $i." }
    }
    ($pages.BaseName -join ', ')
}

Invoke-Step 'Log headings have the agreed form' {
    $heads = @((Read-RepoText 'wiki/log.md') -split "`n" | Where-Object { $_ -match '^## ' })
    $bad = @($heads | Where-Object { $_ -notmatch '^## \[\d{4}-\d{2}-\d{2}\] [a-z]+ \| .+' })
    if ($bad.Count) { Stop-Fail ("Badly formed log headings:`n" + (($bad | Select-Object -First 5) -join "`n")) }
    "$($heads.Count) log entries"
}

Invoke-Step 'Wiki check: index complete, log and phase order correct' {
    Assert-NoLintErrors -Report (Get-WikiLint) -Codes 'INDEX-MISSING', 'LOG-FORMAT', 'PHASE-ORDER'
    'INDEX-MISSING, LOG-FORMAT, PHASE-ORDER: 0 errors'
}

Complete-Check -SaveEvidence:$SaveEvidence
