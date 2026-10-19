#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p5.13 (P5 Measurement): Reading: measurement methods.

.DESCRIPTION
  What it checks : (1) the new reading note exists, is listed in the wiki index and its fingerprint list, and every
                   source in it is marked as read (VERIFIED) or not (UNCERTAIN); (2) each headline measurement page
                   (memory, its peak, CPU time, the three startup moments) is marked "defined", cites the new note and
                   cites the accuracy test (memory and CPU: the p5.4 check; startup: the p5.6 check, since startup is
                   not part of the p5.4 meter test), and has no open point left for this phase.
  Why            : Our methods must match good practice → read the literature on measurement and browser
                   benchmarking → each headline measurement gets a final, cited definition.
  What it changes: nothing.
  How long       : under a second.
  How to run     : pwsh -NoProfile -File scripts/verify/p5.13-reading-measurement-methods.ps1
  Result         : PASS or FAIL (the line says what).
  Tell Claude    : "p5.13 check passed", or paste the FAIL lines.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    Phase-page verify field: New raw research notes; each headline metric page has status defined and cites p5.4
    evidence.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p5.13' -Title 'Reading: measurement methods' -Phase 'phase-p5-telemetry' `
    -Why 'each headline measurement gets a final, cited definition.'

$note = 'wiki/raw/research/literature-batch-5.md'

Invoke-Step 'The reading note: saved, indexed, fingerprinted, each source marked read or not' {
    $t = Read-RepoText $note
    if ((Read-RepoText 'wiki/index.md') -notmatch [regex]::Escape('raw/research/literature-batch-5.md')) { Stop-Fail 'The note is not in wiki/index.md.' }
    if ((Read-RepoText 'wiki/raw/MANIFEST.sha256') -notmatch [regex]::Escape('  research/literature-batch-5.md')) { Stop-Fail 'The note has no line in MANIFEST.sha256.' }
    $entries = @([regex]::Matches($t, '(?m)^### L\d+\. .*$') | ForEach-Object { $_.Value })
    if ($entries.Count -lt 8) { Stop-Fail "Only $($entries.Count) sources in the note." }
    $unmarked = @($entries | Where-Object { $_ -notmatch 'VERIFIED|UNCERTAIN' })
    if ($unmarked.Count -gt 0) { Stop-Fail "Sources without a VERIFIED or UNCERTAIN mark: $($unmarked -join '; ')" }
    "$($entries.Count) sources, each marked; in the index and the fingerprint list"
}

Invoke-Step 'Each headline measurement: defined, cites the note and its accuracy test, no open point for P5' {
    $pages = [ordered]@{
        'metric-tree-private-commit'      = 'check-p5.4'
        'metric-peak-tree-private-commit' = 'check-p5.4'
        'metric-tree-cpu-time'            = 'check-p5.4'
        'metric-startup-window-visible'   = 'check-p5.6'
        'metric-startup-fcp'              = 'check-p5.6'
        'metric-startup-lcp'              = 'check-p5.6'
    }
    foreach ($m in $pages.Keys) {
        $path = "wiki/research/metrics/$m.md"
        $fm = Get-Frontmatter $path
        if ($fm['status'] -ne 'defined') { Stop-Fail "$m has status '$($fm['status'])', not defined." }
        $t = Read-RepoText $path
        if ($t -notmatch 'literature-batch-5') { Stop-Fail "$m does not cite literature batch 5." }
        if ($t -notmatch [regex]::Escape($pages[$m])) { Stop-Fail "$m does not cite $($pages[$m])." }
        if ($t -match 'phase-p5-telemetry\]|verify_in: phase-p5-telemetry') { Stop-Fail "$m still has a point to check in P5." }
    }
    'six pages defined, each citing the note and its accuracy test; no open point for P5 left on them'
}

Complete-Check -SaveEvidence:$SaveEvidence
