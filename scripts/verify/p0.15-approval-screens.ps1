#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p0.15 (P0 Planning): Build the approval screens.

.DESCRIPTION
  What it checks : the browser test of the approval flow passes on a temporary copy: approve a sample page,
                   edit only its bookkeeping lines (badge says "approved, bookkeeping changed"), edit its body
                   (badge turns to outdated), request changes with a comment.
                   Note: you now approve in Claude Code (adr-0023), not on these screens; this check only
                   proves the old screens still behave as built.
  Why            : an approval must go out of date the moment its page changes.
  What it changes: nothing in the repo. The test edits a temporary copy only; ignored folders are written.
  How long       : about 45 seconds.
  How to run     : pwsh -NoProfile -File scripts/verify/p0.15-approval-screens.ps1
                   (close any plan app you started yourself first: the tests use ports 3418-3420)
  Result         : PASS = exit 0, FAIL = exit 1, NOT READY = exit 2 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p0.15 check failed".
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p0.15' -Title 'Build the approval screens' -Phase 'phase-p0-planning' `
    -Why 'an approval must go out of date the moment its page changes.'

Invoke-Step 'Editing an approved page turns its badge to outdated' {
    $r = Assert-NpmScript 'test:e2e' -Extra @('approval-flow.spec')
    $line = ($r.Output -split "`r?`n" | Where-Object { $_ -match '^\s+\d+ passed' } | Select-Object -Last 1)
    "approval flow browser test: $($line.Trim())"
}

Complete-Check -SaveEvidence:$SaveEvidence
