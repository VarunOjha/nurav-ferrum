#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p0.1 (P0 Planning): Save the starting documents.

.DESCRIPTION
  What it checks : your original brief and your scoping answers are still in the wiki, marked as never
                   to be edited, and their fingerprints (sha256) in wiki/raw/MANIFEST.sha256 still match.
  Why            : every plan page cites these two files → if they changed silently, the whole plan
                   would rest on words you never wrote.
  What it changes: nothing. It only reads files (unless you add -SaveEvidence).
  How long       : about 2 seconds.
  How to run     : pwsh -NoProfile -File scripts/verify/p0.1-starting-documents.ps1
  Result         : PASS = exit 0, FAIL = exit 1, NOT READY = exit 2 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p0.1 check failed".
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p0.1' -Title 'Save the starting documents' -Phase 'phase-p0-planning' `
    -Why 'the brief and scoping answers are the ground truth that every page cites.'

$files = @('00-master-prompt.md', '01-scoping-decisions.md')

# Step 1: both files exist and say at the top that they must never be edited.
Invoke-Step 'Both starting documents exist and are marked unchangeable' {
    foreach ($f in $files) {
        $head = ((Read-RepoText "wiki/raw/$f") -split "`n" | Select-Object -First 5) -join "`n"
        if ($head -notmatch 'Immutable raw source') { Stop-Fail "wiki/raw/$f does not say 'Immutable raw source' in its first lines." }
    }
    'wiki/raw/00-master-prompt.md, wiki/raw/01-scoping-decisions.md'
}

# Step 2: their fingerprints match the ones recorded when they were saved.
Invoke-Step 'Their fingerprints still match the recorded ones' {
    $manifest = Get-ManifestEntries
    foreach ($f in $files) {
        if (-not $manifest.ContainsKey($f)) { Stop-Fail "MANIFEST.sha256 has no line for $f." }
        $now = (Get-ContentHash "wiki/raw/$f").Substring(7)
        if ($now -ne $manifest[$f]) { Stop-Fail "$f changed since it was saved (recorded $($manifest[$f].Substring(0,12))..., now $($now.Substring(0,12))...)." }
    }
    'both match wiki/raw/MANIFEST.sha256'
}

Complete-Check -SaveEvidence:$SaveEvidence
