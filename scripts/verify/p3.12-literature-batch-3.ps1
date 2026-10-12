#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.12 (P3 Tabs and sessions): Literature batch 3.

.DESCRIPTION
  What it checks : (1) the new reading note wiki/raw/research/literature-batch-3.md exists, gives the access date
                   and lists its web sources, and its fingerprint is in wiki/raw/MANIFEST.sha256 (raw files never
                   change). (2) Every source entry in it carries a VERIFIED or UNCERTAIN label, so nothing is cited
                   without saying whether it was read. (3) The seed list's open points this batch set out to settle
                   (F3, G1, G2) are either closed in the note and on the seed summary page, or still flagged. (4) The
                   reading log has a row for batch 3 that links the note, and the wiki check reports no errors.
  Why            : the paper needs sources → Claude reads primary sources and labels what was really read → every
                   later claim (tab sleeping, lifecycle policies) can cite something real.
  What it changes: nothing.
  How long       : about 20 seconds.
  How to run     : pwsh -NoProfile -File scripts/verify/p3.12-literature-batch-3.ps1
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p3.12 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). Phase-page verify field:
    New raw research notes with access dates; seed-list entries marked UNCERTAIN are either verified or still flagged.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p3.12' -Title 'Literature batch 3' -Phase 'phase-p3-tabs-sessions' `
    -Why 'later claims about tab sleeping and lifecycles can cite something real.'

$note = 'wiki/raw/research/literature-batch-3.md'

Invoke-Step 'New dated note with its web sources, fingerprinted in the raw manifest' {
    Assert-RepoFile $note
    $t = Read-RepoText $note
    if ($t -notmatch 'Access date for every URL: 2026-\d\d-\d\d') { Stop-Fail 'The note does not state an access date.' }
    $urls = @([regex]::Matches(($t -split "`n---`n", 3)[0], '(?m)^\s+- (https?://\S+)') | ForEach-Object { $_.Groups[1].Value })
    if ($urls.Count -lt 5) { Stop-Fail "Expected at least 5 web sources in the header; found $($urls.Count)." }
    if ((Read-RepoText 'wiki/raw/MANIFEST.sha256') -notmatch [regex]::Escape('research/literature-batch-3.md')) { Stop-Fail 'The note has no line in wiki/raw/MANIFEST.sha256.' }
    "access date stated; $($urls.Count) web sources; manifest line present"
}

Invoke-Step 'Every source entry says whether it was read (VERIFIED or UNCERTAIN)' {
    $sections = [regex]::Split((Read-RepoText $note), '(?m)^## ') | Where-Object { $_ -match '^L\d+\.' }
    if ($sections.Count -lt 5) { Stop-Fail "Expected at least 5 source entries (## L1. ...); found $($sections.Count)." }
    $bad = @($sections | Where-Object { $_ -notmatch '\*\*(VERIFIED|UNCERTAIN)\*\*' } | ForEach-Object { ($_ -split "`n")[0] })
    if ($bad.Count) { Stop-Fail "Entries without a VERIFIED/UNCERTAIN label: $($bad -join '; ')" }
    "$($sections.Count) entries, each labelled"
}

Invoke-Step 'Seed-list open points: closed with a source, or still flagged' {
    $t = Read-RepoText $note
    $seed = Read-RepoText 'wiki/research/ov-research-related-work-seed.md'
    $missing = @(foreach ($id in 'F3', 'G1', 'G2') {
            $closedInNote = $t -match "\b$id\b"
            $row = ($seed -split "`n" | Where-Object { $_ -match "^\| $id \|" } | Select-Object -First 1)
            if (-not $closedInNote -or $row -notmatch 'batch 3') { $id }
        })
    if ($missing.Count) { Stop-Fail "Not settled in the note and on the seed page: $($missing -join ', ')" }
    'F3, G1, G2 closed with batch 3 sources (note and seed summary page)'
}

Invoke-Step 'Reading log has a row for batch 3; wiki check clean' {
    $log = Read-RepoText 'wiki/research/ov-research-literature-log.md'
    if ($log -notmatch '(?m)^\| 3 \| P3 \|.*literature-batch-3\.md') { Stop-Fail 'ov-research-literature-log has no batch 3 row linking the note.' }
    Assert-NoLintErrors -Report (Get-WikiLint)
    'batch 3 row present; npm run lint:wiki: 0 errors'
}

Complete-Check -SaveEvidence:$SaveEvidence
