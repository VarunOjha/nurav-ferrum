#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p0.17 (P0 Planning): Portal v2, then your review.

.DESCRIPTION
  What it checks : (1) the portal's plain-language text (plan/portal/) is complete and up to date with the
                   wiki (tools/portal-sync-check.ps1 says "clean"); (2) every task and phase has its check
                   script and every script can be read by PowerShell; (3) your approvals of the pages P1
                   depends on are recorded (the rulebook, the P1 phase page, its decisions and its parts).
  Why            : you found the first plan app too technical → the portal shows plain text written from the
                   wiki → you review it and approve in Claude Code, and Claude records each approval.
  What it changes: nothing. It only reads files.
  How long       : about 10 seconds.
  How to run     : pwsh -NoProfile -File scripts/verify/p0.17-portal-v2.ps1
  Result         : PASS = exit 0, FAIL = exit 1, NOT READY = exit 2 (scripts/lib/Ferrum.Check.psm1).
                   Until you have approved the P1 pages it ends NOT READY (exit 2): that is expected.
  Tell Claude    : nothing while it says NOT READY. If a step FAILS, paste the FAIL lines and say
                   "p0.17 check failed".
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p0.17' -Title 'Portal v2, then your review' -Phase 'phase-p0-planning' `
    -Why 'you read the plan in plain words and approve it in Claude Code.'

Invoke-Step 'Portal text is complete and up to date with the wiki' {
    $pwsh = (Get-Process -Id $PID).Path
    $r = Invoke-Native -FilePath $pwsh -ArgumentList @('-NoProfile', '-NonInteractive', '-File', (Get-RepoPath 'tools/portal-sync-check.ps1'))
    if ($r.ExitCode -ne 0) { Stop-Fail "The portal check found problems:`n$(Get-Tail $r.Output 10)" }
    (Get-Tail $r.Output 1)
}

Invoke-Step 'Every task and phase has a check script that PowerShell can read' {
    $pwsh = (Get-Process -Id $PID).Path
    $r = Invoke-Native -FilePath $pwsh -ArgumentList @('-NoProfile', '-NonInteractive', '-File', (Get-RepoPath 'scripts/test-check-scripts.ps1'))
    if ($r.ExitCode -ne 0) { Stop-Fail "The script test found problems:`n$(Get-Tail $r.Output 10)" }
    ($r.Output -split "`r?`n" | Where-Object { $_ -match '^\s+\d+ (files parsed|scripts linked)' } | ForEach-Object Trim) -join '; '
}

Invoke-Step 'Your approvals of the pages P1 depends on are recorded' {
    $fm = Get-Frontmatter 'wiki/phases/phase-p1-foundation.md'
    $list = { param($v) @(($v -replace '^\[|\]$', '') -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ }) }
    $keys = @('schema', 'phase-p1-foundation') + (& $list $fm['decisions']) + (& $list $fm['components'])
    Assert-Approved -Keys $keys -What 'your approval of the P1 pages'
}

Complete-Check -SaveEvidence:$SaveEvidence
