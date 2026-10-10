#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p0.18 (P0 Planning): Close P0.

.DESCRIPTION
  What it checks : your approval of the P0 exit is recorded (key phase-p0-planning#exit), the wiki log has a
                   "gate" entry for P0, and all work is committed locally (nothing left uncommitted).
  Why            : all checks pass and the pages are approved → you approve the phase exit → P1 may start.
  What it changes: nothing. It only reads files.
  How long       : about 2 seconds.
  How to run     : pwsh -NoProfile -File scripts/verify/p0.18-close-p0.ps1
  Result         : PASS = exit 0, FAIL = exit 1, NOT READY = exit 2 (scripts/lib/Ferrum.Check.psm1).
                   Until you approve the P0 exit it ends NOT READY (exit 2): that is expected.
  Tell Claude    : nothing while it says NOT READY. Once you have approved the exit and it still is not PASS,
                   paste the lines and say "p0.18 check failed".
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p0.18' -Title 'Close P0' -Phase 'phase-p0-planning' `
    -Why 'P1 may start only after you approve the P0 exit.'

Invoke-Step 'Your approval of the P0 exit is recorded' {
    Assert-Approved -Keys 'phase-p0-planning#exit' -What 'your approval of the P0 exit'
}

Invoke-Step 'The log has a gate entry for P0' {
    if (-not (Test-LogHeading '\] gate \| phase-p0-planning')) { Stop-Wait 'No "gate | phase-p0-planning" entry in wiki/log.md yet (Claude writes it at the P0 exit review).' }
    'gate entry found'
}

Invoke-Step 'All work is committed locally' {
    $r = Invoke-Native -FilePath 'git' -ArgumentList @('status', '--porcelain')
    if ($r.Output.Trim()) { Stop-Wait "Uncommitted changes remain:`n$(Get-Tail $r.Output 6)" }
    "clean at $(Get-GitCommit)"
}

Complete-Check -SaveEvidence:$SaveEvidence
