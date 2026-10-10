#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p0.10 (P0 Planning): Create the plan app skeleton.

.DESCRIPTION
  What it checks : every library the plan app (interactive_plan/) uses directly is pinned to one exact
                   version; the installed libraries show no conflicts (npm ls); the type check, the code
                   style check and the production build succeed; the three feasibility tests (reading files
                   outside the app, diagrams, this-computer-only network access) were recorded as passed.
  Why            : loose versions break things later → exact versions and a green build give a stable base.
  What it changes: nothing in the repo. The build writes only to interactive_plan/.next (ignored by git).
  How long       : about 30 seconds.
  How to run     : pwsh -NoProfile -File scripts/verify/p0.10-plan-app-skeleton.ps1
  Result         : PASS = exit 0, FAIL = exit 1, NOT READY = exit 2 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p0.10 check failed".
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p0.10' -Title 'Create the plan app skeleton' -Phase 'phase-p0-planning' `
    -Why 'exact versions and a green build give a stable base.'

Invoke-Step 'Every direct library is pinned to an exact version' {
    $bad = Get-InexactVersions 'interactive_plan/package.json'
    if ($bad.Count) { Stop-Fail "Not pinned exactly: $($bad -join ', ')" }
    'no ^ or ~ ranges in interactive_plan/package.json'
}

Invoke-Step 'Installed libraries show no conflicts' {
    $r = Invoke-Npm -Arguments @('ls', '--depth=0')
    if ($r.ExitCode -ne 0) { Stop-Fail "npm ls reports problems:`n$(Get-Tail $r.Output 8)" }
    'npm ls: no missing or conflicting packages'
}

Invoke-Step 'Type check passes' { [void](Assert-NpmScript 'typecheck'); 'npm run typecheck: exit 0' }
Invoke-Step 'Code style check passes' { [void](Assert-NpmScript 'lint'); 'npm run lint: exit 0' }
Invoke-Step 'Production build succeeds' { [void](Assert-NpmScript 'build'); 'npm run build: exit 0' }

Invoke-Step 'The three feasibility tests were recorded as passed' {
    $t = Read-RepoText 'wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-1-spikes.txt'
    foreach ($s in 'S1', 'S2', 'S3') { if ($t -notmatch "(?m)^- $s .*PASS") { Stop-Fail "IP-1-spikes.txt does not record $s as PASS." } }
    [void](Assert-RepoFile 'wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-1-scaffold.txt' 'The skeleton build record')
    'S1, S2, S3 PASS in IP-1-spikes.txt; IP-1-scaffold.txt present'
}

Complete-Check -SaveEvidence:$SaveEvidence
