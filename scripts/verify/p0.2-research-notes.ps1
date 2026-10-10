#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p0.2 (P0 Planning): Write five research notes.

.DESCRIPTION
  What it checks : the five first research notes exist in wiki/raw/research/, each has its header, says
                   when its sources were read (access date), labels claims as checked (VERIFIED) or
                   uncertain, and is unchanged since it was saved (fingerprint in MANIFEST.sha256).
  Why            : decisions rest on these notes → a note without dates or labels could hide a guess.
  What it changes: nothing. It only reads files (unless you add -SaveEvidence).
  How long       : about 2 seconds.
  How to run     : pwsh -NoProfile -File scripts/verify/p0.2-research-notes.ps1
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p0.2 check failed".
  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p0.2' -Title 'Write five research notes' -Phase 'phase-p0-planning' `
    -Why 'plans built from memory go stale; these notes hold the checked facts.'

$notes = @('llm-wiki-pattern', 'tauri-webview2-capabilities', 'measurement-methodology', 'nextjs-stack', 'related-work-seed')

Invoke-Step 'The five notes exist, each with its header' {
    foreach ($n in $notes) {
        $fm = Get-Frontmatter "wiki/raw/research/$n.md"
        if ($fm['type'] -ne 'research-note') { Stop-Fail "$n.md has no research-note header." }
    }
    "$($notes.Count) notes: $($notes -join ', ')"
}

Invoke-Step 'Each note gives access dates and checked/uncertain labels' {
    foreach ($n in $notes) {
        $t = Read-RepoText "wiki/raw/research/$n.md"
        if ($t -notmatch '(?i)access') { Stop-Fail "$n.md never says when its sources were accessed." }
        if ($t -notmatch 'VERIFIED') { Stop-Fail "$n.md has no VERIFIED labels." }
    }
    'access dates and labels found in all five'
}

Invoke-Step 'No note changed since it was saved' {
    $manifest = Get-ManifestEntries
    foreach ($n in $notes) {
        $key = "research/$n.md"
        if (-not $manifest.ContainsKey($key)) { Stop-Fail "MANIFEST.sha256 has no line for $key." }
        if ((Get-ContentHash "wiki/raw/$key").Substring(7) -ne $manifest[$key]) { Stop-Fail "$key changed since it was saved." }
    }
    'all five match wiki/raw/MANIFEST.sha256'
}

Complete-Check -SaveEvidence:$SaveEvidence
