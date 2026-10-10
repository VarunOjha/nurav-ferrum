#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p1.3 (P1 Foundation): Set ignore rules and licences.

.DESCRIPTION
  What it checks : git ignores every build-output and local-data folder (Rust "target" folders, the spikes'
                   target folders, Node's node_modules, the plan app's .next, benchmark results) but does NOT
                   ignore plan snapshots; both licence files (MIT and Apache) exist.
  Why            : build output and local data must never reach git → plus two licence files, the repo is
                   clean and legally clear.
  What it changes: nothing. It only asks git which paths it would ignore.
  How long       : about 2 seconds.
  How to run     : pwsh -NoProfile -File scripts/verify/p1.3-ignore-licences.ps1
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p1.3 check failed".
  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). Licence files: LICENSE-MIT, LICENSE-APACHE.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p1.3' -Title 'Set ignore rules and licences' -Phase 'phase-p1-foundation' `
    -Why 'build output and local data must not reach git, and the licence must be clear.'

Invoke-Step 'Build output and local data folders are ignored by git' {
    $paths = 'target/x', 'spikes/s1-multiwebview/target/x', 'node_modules/x', 'interactive_plan/.next/x', 'benchmarks/results/x'
    $notIgnored = @(foreach ($p in $paths) {
        $r = Invoke-Native -FilePath 'git' -ArgumentList @('check-ignore', '-q', '--no-index', $p)
        if ($r.ExitCode -ne 0) { $p }
    })
    if ($notIgnored.Count) { Stop-Fail "Not ignored yet: $($notIgnored -join ', ') (add rules to .gitignore)." }
    "$($paths.Count) paths ignored"
}

Invoke-Step 'Plan snapshots are kept (not ignored)' {
    $r = Invoke-Native -FilePath 'git' -ArgumentList @('check-ignore', '-q', '--no-index', 'plan/snapshots/x')
    if ($r.ExitCode -eq 0) { Stop-Fail 'plan/snapshots/ is ignored, but it must stay in git.' }
    'plan/snapshots/ stays tracked'
}

Invoke-Step 'Both licence files exist' {
    [void](Assert-RepoFile 'LICENSE-MIT' 'The MIT licence file')
    [void](Assert-RepoFile 'LICENSE-APACHE' 'The Apache 2.0 licence file')
    'LICENSE-MIT, LICENSE-APACHE'
}

Complete-Check -SaveEvidence:$SaveEvidence
