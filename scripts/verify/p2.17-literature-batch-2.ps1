#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p2.17 (P2 First working app): Literature batch 2.

.DESCRIPTION
  What it checks : (1) the new reading note wiki/raw/research/literature-batch-2.md exists, gives the access date
                   and lists its web sources, and its fingerprint is in wiki/raw/MANIFEST.sha256 (raw files never
                   change). (2) Every source entry in it carries a VERIFIED or UNCERTAIN label, so nothing is cited
                   without saying whether it was read. (3) The reading log page has a row for batch 2 that links the
                   note. (4) The wiki check reports no errors.
  Why            : the paper needs sources → Claude reads primary sources and labels what was really read → every
                   later claim can cite something real (evidence for later experiments).
  What it changes: nothing.
  How long       : about 20 seconds.
  How to run     : pwsh -NoProfile -File scripts/verify/p2.17-literature-batch-2.ps1
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p2.17 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). Phase-page verify field: new raw research notes with access
                   dates; ov-research-literature-log (created in p1.14) updated; no unverified citation.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p2.17' -Title 'Literature batch 2' -Phase 'phase-p2-minimal-container' `
    -Why 'evidence for later experiments.'

$note = 'wiki/raw/research/literature-batch-2.md'

Invoke-Step 'New dated note with its web sources, fingerprinted in the raw manifest' {
    Assert-RepoFile $note
    $t = Read-RepoText $note
    if ($t -notmatch 'Access date for every URL: 2026-\d\d-\d\d') { Stop-Fail 'The note does not state an access date.' }
    $urls = @([regex]::Matches(($t -split "`n---`n", 3)[0], '(?m)^\s+- (https?://\S+)') | ForEach-Object { $_.Groups[1].Value })
    if ($urls.Count -lt 5) { Stop-Fail "Expected at least 5 web sources in the header; found $($urls.Count)." }
    $manifest = Read-RepoText 'wiki/raw/MANIFEST.sha256'
    if ($manifest -notmatch [regex]::Escape('research/literature-batch-2.md')) { Stop-Fail 'The note has no line in wiki/raw/MANIFEST.sha256.' }
    "access date stated; $($urls.Count) web sources; manifest line present"
}

Invoke-Step 'Every source entry says whether it was read (VERIFIED or UNCERTAIN)' {
    $t = Read-RepoText $note
    $sections = [regex]::Split($t, '(?m)^## ') | Where-Object { $_ -match '^L\d+\.' }
    if ($sections.Count -lt 5) { Stop-Fail "Expected at least 5 source entries (## L1. …); found $($sections.Count)." }
    $bad = @($sections | Where-Object { $_ -notmatch '\*\*(VERIFIED|UNCERTAIN)\*\*' } | ForEach-Object { ($_ -split "`n")[0] })
    if ($bad.Count) { Stop-Fail "Entries without a VERIFIED/UNCERTAIN label: $($bad -join '; ')" }
    "$($sections.Count) entries, each labelled"
}

Invoke-Step 'Reading log has a row for batch 2; wiki check clean' {
    $log = Read-RepoText 'wiki/research/ov-research-literature-log.md'
    if ($log -notmatch '(?m)^\| 2 \| P2 \|.*literature-batch-2\.md') { Stop-Fail 'ov-research-literature-log has no batch 2 row linking the note.' }
    Assert-NoLintErrors -Report (Get-WikiLint)
    'batch 2 row present; npm run lint:wiki: 0 errors'
}

Complete-Check -SaveEvidence:$SaveEvidence
