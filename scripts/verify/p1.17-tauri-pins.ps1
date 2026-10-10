#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p1.17 (P1 Foundation): Pin the Tauri and web-tool versions.

.DESCRIPTION
  What it checks : experiment 1's package file (spikes/s1-multiwebview/package.json) pins Tauri's
                   command-line tool, Vite and TypeScript to exact versions (no "^" or "~"), and the Tauri
                   tool's version is saved in the toolchain record (toolchain.txt).
  Why            : generated templates change under us → exact pins mean the experiments can be rerun
                   identically.
  What it changes: nothing. It only reads files.
  How long       : about 2 seconds.
  How to run     : pwsh -NoProfile -File scripts/verify/p1.17-tauri-pins.ps1
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p1.17 check failed".
  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p1.17' -Title 'Pin the Tauri and web-tool versions' -Phase 'phase-p1-foundation' `
    -Why 'exact pins let the experiments be rerun identically.'

$pkg = 'spikes/s1-multiwebview/package.json'

Invoke-Step 'Tauri tool, Vite and TypeScript are pinned exactly' {
    [void](Assert-RepoFile $pkg "Experiment 1's package file")
    $j = Read-RepoText $pkg | ConvertFrom-Json -AsHashtable
    $all = @{}
    foreach ($sec in 'dependencies', 'devDependencies') { if ($j.ContainsKey($sec)) { foreach ($k in $j[$sec].Keys) { $all[$k] = $j[$sec][$k] } } }
    $need = '@tauri-apps/cli', 'vite', 'typescript'
    $absent = @($need | Where-Object { -not $all.ContainsKey($_) })
    if ($absent.Count) { Stop-Fail "Not listed in ${pkg}: $($absent -join ', ')." }
    $bad = Get-InexactVersions $pkg -Only $need
    if ($bad.Count) { Stop-Fail "Not pinned exactly: $($bad -join ', ')." }
    ($need | ForEach-Object { "$_ $($all[$_])" }) -join ', '
}

Invoke-Step "Tauri tool's version is saved in the toolchain record" {
    $t = Read-RepoText 'wiki/raw/evidence/phase-p1-foundation/toolchain.txt'
    if ($t -notmatch '(?i)tauri-cli\s+\d') { Stop-Fail 'toolchain.txt has no "tauri-cli <version>" line (output of npx tauri --version).' }
    'tauri-cli version recorded'
}

Complete-Check -SaveEvidence:$SaveEvidence
