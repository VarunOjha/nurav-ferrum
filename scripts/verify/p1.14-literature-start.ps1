#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p1.14 (P1 Foundation): Start the literature review.

.DESCRIPTION
  What it checks : the search-method page (ov-research-literature-protocol) and the reading-log page
                   (ov-research-literature-log) exist and are listed in the wiki index; at least one new
                   research note was added after P0, with access dates and checked/uncertain labels.
                   Whether every citation was really fetched is reviewed by reading, not by this script.
  Why            : a research claim needs prior work → a written search method and checked sources mean no
                   novelty is claimed without evidence.
  What it changes: nothing. It only reads files.
  How long       : about 2 seconds.
  How to run     : pwsh -NoProfile -File scripts/verify/p1.14-literature-start.ps1
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p1.14 check failed".
  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p1.14' -Title 'Start the literature review' -Phase 'phase-p1-foundation' `
    -Why 'no novelty may be claimed without checked prior work.'

Invoke-Step 'Search-method and reading-log pages exist and are indexed' {
    $index = Read-RepoText 'wiki/index.md'
    foreach ($id in 'ov-research-literature-protocol', 'ov-research-literature-log') {
        [void](Assert-RepoFile "wiki/research/$id.md" "The page $id")
        if ($index -notmatch "\[$([regex]::Escape($id))\]") { Stop-Fail "$id is not listed in wiki/index.md." }
    }
    'both pages exist and are indexed'
}

Invoke-Step 'At least one new research note, dated and labelled' {
    # The six notes written during P0; anything else in wiki/raw/research/ is new.
    $p0 = 'llm-wiki-pattern', 'tauri-webview2-capabilities', 'measurement-methodology', 'nextjs-stack', 'related-work-seed', 'claude-code-hooks-skills'
    $new = @(Get-ChildItem -LiteralPath (Get-RepoPath 'wiki/raw/research') -Filter '*.md' | Where-Object { $_.BaseName -notin $p0 })
    if ($new.Count -eq 0) { Stop-Fail 'No research note was added after P0.' }
    $bad = @($new | Where-Object { $t = Read-RepoText "wiki/raw/research/$($_.Name)"; $t -notmatch '(?i)access' -or $t -notmatch 'VERIFIED|UNCERTAIN' } | ForEach-Object Name)
    if ($bad.Count) { Stop-Fail "New notes without access dates or labels: $($bad -join ', ')." }
    "$($new.Count) new note(s): $(($new | ForEach-Object BaseName) -join ', ')"
}

Complete-Check -SaveEvidence:$SaveEvidence
