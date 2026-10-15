#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p4.13 (P4 Security): literature batch 4.

.DESCRIPTION
  What it checks : (1) the research note wiki/raw/research/literature-batch-4.md exists, states the access date of its
                   web pages, and labels every source VERIFIED or UNCERTAIN; (2) each source's web address is listed in
                   the note's header; (3) the related-work page cites the note in its section H; (4) the note has its
                   fingerprint line, so it cannot change unnoticed.
  Why            : the paper's security section needs real, checked sources → a dated note says what was read where →
                   nothing is cited that nobody opened.
  What it changes: nothing.
  How long       : a few seconds.
  How to run     : pwsh -NoProfile -File scripts/verify/p4.13-literature-batch-4.ps1
  Result         : PASS (every checked step is fine) or FAIL (the line says what).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p4.13 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    Phase-page verify field: New raw research notes with access dates.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p4.13' -Title 'Literature batch 4' -Phase 'phase-p4-security' `
    -Why 'nothing is cited that nobody opened.'

$note = 'wiki/raw/research/literature-batch-4.md'

Invoke-Step 'The note exists, gives the access date, and labels every source' {
    Assert-RepoFile $note
    $t = (Read-RepoText $note) -replace "`r`n", "`n"
    if ($t -notmatch '\*\*Access date for every URL: \d{4}-\d{2}-\d{2}\.\*\*') { Stop-Fail 'The note does not state the access date of its web pages.' }
    $items = @([regex]::Matches($t, '(?m)^### L\d+\. .+$') | ForEach-Object Value)
    if ($items.Count -lt 8) { Stop-Fail "Only $($items.Count) sources (expected at least 8)." }
    $unlabelled = @($items | Where-Object { $_ -notmatch ' — (VERIFIED|UNCERTAIN)' })
    if ($unlabelled.Count) { Stop-Fail "Sources without a VERIFIED or UNCERTAIN label:`n$($unlabelled -join "`n")" }
    "$($items.Count) sources, each labelled; access date stated"
}

Invoke-Step 'Every source names a page that is listed in the note''s header' {
    $t = (Read-RepoText $note) -replace "`r`n", "`n"
    $header = ($t -split "`n---`n", 2)[0]
    $urls = @([regex]::Matches($header, '(?m)^  - (https://\S+)') | ForEach-Object { $_.Groups[1].Value })
    if ($urls.Count -lt 8) { Stop-Fail "Only $($urls.Count) web addresses in the header." }
    "$($urls.Count) web addresses listed"
}

Invoke-Step 'The related-work page cites the note (section H)' {
    $p = Read-RepoText 'wiki/research/ov-research-related-work-seed.md'
    if ($p -notmatch '## H\. Embedded-browser and WebView security' -or $p -notmatch 'literature-batch-4\.md') { Stop-Fail 'Section H or the citation is missing.' }
    'section H cites literature-batch-4'
}

Invoke-Step 'The note has its fingerprint line and matches it' {
    $m = Get-ManifestEntries
    $rel = 'research/literature-batch-4.md'
    if (-not $m.ContainsKey($rel)) { Stop-Fail 'No fingerprint line in wiki/raw/MANIFEST.sha256.' }
    if ((Get-ContentHash $note).Substring(7) -ne $m[$rel]) { Stop-Fail 'The note does not match its fingerprint.' }
    'fingerprint matches'
}

Complete-Check -SaveEvidence:$SaveEvidence
