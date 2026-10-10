#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p0.4 (P0 Planning): Describe the architecture and its parts.

.DESCRIPTION
  What it checks : every planned part (component) has exactly one page whose id matches its file name,
                   and the wiki check finds no link between parts that crosses a trust level without
                   being marked (rule TRUST-EDGE), and no duplicate or badly formed ids.
  Why            : the app has parts with different trust levels → marking every crossing makes the
                   security boundaries visible before any code exists.
  What it changes: nothing. It only reads files (unless you add -SaveEvidence).
  How long       : about 6 seconds (it runs the wiki check of the plan app).
  How to run     : pwsh -NoProfile -File scripts/verify/p0.4-architecture-pages.ps1
  Result         : PASS = exit 0, FAIL = exit 1, NOT READY = exit 2 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p0.4 check failed".
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p0.4' -Title 'Describe the architecture and its parts' -Phase 'phase-p0-planning' `
    -Why 'marking every trust crossing shows the security boundaries before any code.'

Invoke-Step 'One page per part, id matching the file name' {
    $pages = @(Get-ChildItem -LiteralPath (Get-RepoPath 'wiki/architecture/components') -Filter 'comp-*.md')
    if ($pages.Count -eq 0) { Stop-Fail 'No component pages found in wiki/architecture/components/.' }
    foreach ($p in $pages) {
        $fm = Get-Frontmatter "wiki/architecture/components/$($p.Name)"
        if ($fm['id'] -ne $p.BaseName) { Stop-Fail "$($p.Name) has id '$($fm['id'])'." }
        if ($fm['type'] -ne 'component') { Stop-Fail "$($p.Name) is not marked as a component page." }
    }
    "$($pages.Count) component pages"
}

Invoke-Step 'Wiki check: trust crossings marked, ids unique and well formed' {
    $lint = Get-WikiLint
    Assert-NoLintErrors -Report $lint -Codes 'TRUST-EDGE', 'ID-DUP', 'ID-PATTERN', 'REF-DANGLING'
    'rules TRUST-EDGE, ID-DUP, ID-PATTERN, REF-DANGLING: 0 errors'
}

Complete-Check -SaveEvidence:$SaveEvidence
