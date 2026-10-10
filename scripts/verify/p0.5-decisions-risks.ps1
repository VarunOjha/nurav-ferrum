#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p0.5 (P0 Planning): Write the decisions and the risk register.

.DESCRIPTION
  What it checks : the 19 first decision pages (adr-0001 to adr-0019) exist once each and have all their
                   required sections; every risk page has likelihood, impact, response (mitigation),
                   a planned experiment field and an owning phase; the wiki check finds no broken chain
                   of replaced decisions (rule ADR-CHAIN).
  Why            : choices and risks get forgotten → one page each lets us always see why we chose
                   something and what could go wrong.
  What it changes: nothing. It only reads files (unless you add -SaveEvidence).
  How long       : about 6 seconds (it runs the wiki check of the plan app).
  How to run     : pwsh -NoProfile -File scripts/verify/p0.5-decisions-risks.ps1
  Result         : PASS = exit 0, FAIL = exit 1, NOT READY = exit 2 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p0.5 check failed".
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p0.5' -Title 'Write the decisions and the risk register' -Phase 'phase-p0-planning' `
    -Why 'one page per decision and per risk keeps the reasons and dangers visible.'

Invoke-Step 'Decisions 1 to 19 exist, one page each' {
    $dir = Get-RepoPath 'wiki/decisions'
    foreach ($n in 1..19) {
        $hits = @(Get-ChildItem -LiteralPath $dir -Filter ('adr-{0:0000}-*.md' -f $n))
        if ($hits.Count -ne 1) { Stop-Fail ("adr-{0:0000}: expected exactly one page, found {1}." -f $n, $hits.Count) }
    }
    '19 pages'
}

Invoke-Step 'Every risk page has likelihood, impact, response, experiment and owning phase' {
    $risks = @(Get-ChildItem -LiteralPath (Get-RepoPath 'wiki/risks') -Filter 'risk-r*.md')
    foreach ($r in $risks) {
        $fm = Get-Frontmatter "wiki/risks/$($r.Name)"
        $missing = @('likelihood', 'impact', 'mitigation', 'spike', 'owner_phase' | Where-Object { -not $fm.Contains($_) })
        if ($missing.Count) { Stop-Fail "$($r.Name) is missing: $($missing -join ', ')." }
    }
    "$($risks.Count) risk pages"
}

Invoke-Step 'Wiki check: decision sections, replaced-decision chain and risk scores' {
    $lint = Get-WikiLint
    Assert-NoLintErrors -Report $lint -Codes 'ADR-CHAIN', 'FM-MISSING', 'FM-ENUM'
    $warn = Get-LintFindings -Report $lint -Codes 'ADR-SECTIONS', 'RISK-SCORE'
    if ($warn.Count) { Stop-Fail ("Missing sections or bad risk scores:`n" + (($warn | ForEach-Object { "$($_.path): $($_.message)" }) -join "`n")) }
    'ADR-CHAIN, ADR-SECTIONS, RISK-SCORE: none found'
}

Complete-Check -SaveEvidence:$SaveEvidence
