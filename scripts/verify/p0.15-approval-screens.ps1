#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p0.15 (P0 Planning): Build the approval screens.

.DESCRIPTION
  What it checks : an approval goes out of date the moment its page changes: the approval-state tests
                   (approve a sample page, edit only its bookkeeping lines, edit its body, request changes)
                   and the portal's read-only approval labels ("Approved", "Approved, page edited since",
                   "Changes requested", ...) pass.
                   Note: you now approve in Claude Code (adr-0023). The approval screens of the first app
                   were removed with the read-only portal in task p0.17 (2026-10-09); this check now covers
                   the rules those screens showed, which the portal and Claude's checker still use.
  Why            : an approval must go out of date the moment its page changes.
  What it changes: nothing in the repo. The tests edit temporary copies only.
  How long       : about 20 seconds.
  How to run     : pwsh -NoProfile -File scripts/verify/p0.15-approval-screens.ps1
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

Invoke-Step 'Editing an approved page makes its approval outdated' {
    $r = Assert-NpmScript 'test' -Extra @('tests/unit/state.test.ts', 'tests/unit/portal-load.test.ts')
    $line = ($r.Output -split "`r?`n" | Where-Object { $_ -match '^\s+Tests\s' } | Select-Object -Last 1)
    "approval state and label tests: $($line.Trim())"
}

Complete-Check -SaveEvidence:$SaveEvidence
