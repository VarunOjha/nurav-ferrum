#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p0.9 (P0 Planning): Install Node and record versions.

.DESCRIPTION
  What it checks : Node.js is installed with major version 24 (the plan app needs it), npm and git answer
                   with their versions, the saved record of those versions exists and
                   names Node 24, and your first approval round ("Wave 0") was saved word for word.
  Why            : the plan app needs Node 24 → exact versions written down mean builds can be repeated.
  What it changes: nothing. It only reads files and asks programs for their version.
  How long       : about 3 seconds.
  How to run     : pwsh -NoProfile -File scripts/verify/p0.9-node-toolchain.ps1
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If Node is no longer version 24, say "p0.9 check failed: Node is
                   version <n>"; Claude must ask you before using another major version.
  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). Saved record:
                   wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-0-toolchain.txt.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p0.9' -Title 'Install Node and record versions' -Phase 'phase-p0-planning' `
    -Why 'exact tool versions make builds repeatable.'

Invoke-Step 'Node.js is version 24' {
    $r = Invoke-Native -FilePath 'node' -ArgumentList @('--version')
    $v = Get-VersionNumber $r.Output
    if (-not $v) { Stop-Fail "node --version printed: $($r.Output)" }
    if ($v.Major -ne 24) { Stop-Fail "Node is $($r.Output.Trim()); the plan needs major version 24 (ask the owner before changing)." }
    "node $($r.Output.Trim())"
}

Invoke-Step 'npm and git answer with their versions' {
    $npm = Invoke-Npm -Arguments @('--version') -Folder '.'
    $git = Invoke-Native -FilePath 'git' -ArgumentList @('--version')
    if ($npm.ExitCode -ne 0 -or -not (Get-VersionNumber $npm.Output)) { Stop-Fail "npm --version failed: $($npm.Output)" }
    if ($git.ExitCode -ne 0) { Stop-Fail "git --version failed: $($git.Output)" }
    "npm $($npm.Output.Trim()); $($git.Output.Trim())"
}

Invoke-Step 'The saved version record exists and names Node 24' {
    $t = Read-RepoText 'wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-0-toolchain.txt'
    if ($t -notmatch '(?m)^v24\.') { Stop-Fail 'IP-0-toolchain.txt does not record a Node 24 version.' }
    'IP-0-toolchain.txt'
}

Invoke-Step 'Your Wave 0 answers were saved word for word' {
    [void](Assert-RepoFile 'wiki/raw/owner/2026-10-08-s01-wave0.md' 'The saved Wave 0 answers')
    'wiki/raw/owner/2026-10-08-s01-wave0.md'
}

Complete-Check -SaveEvidence:$SaveEvidence
