#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p1.5 (P1 Foundation): Experiment 1, several web views in one window.

.DESCRIPTION
  What it checks : the experiment report (spike-s1-multiwebview.md) has a PASS or FAIL row for each planned
                   check: creating views without freezing, resizing, Alt+Tab keyboard focus, views drawn over
                   each other, blank pages, text-editing shortcuts, and which helper processes belong to the
                   app (Windows job object compared with WebView2's own process list); and the throw-away
                   experiment app still builds (cargo build --locked).
  Why            : Tauri's multi-view feature is experimental → if it is unstable, the design changes before
                   P2, not after.
  What it changes: nothing in the repo. The build writes only to the experiment's ignored target/ folder.
  How long       : about 1 to 3 minutes (Rust build).
  How to run     : pwsh -NoProfile -File scripts/verify/p1.5-spike-multiwebview.ps1
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p1.5 check failed".
  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p1.5' -Title 'Experiment 1: several web views in one window' -Phase 'phase-p1-foundation' `
    -Why 'an unstable multi-view feature must change the design before P2.'

$report = 'wiki/raw/evidence/phase-p1-foundation/spike-s1-multiwebview.md'

Invoke-Step 'The report has a pass/fail row for every planned check' {
    $lines = @((Read-RepoText $report) -split "`n" | Where-Object { $_ -match '^\|' })
    $checks = [ordered]@{
        'creating views without freezing' = '(?i)(deadlock|freez|async)'; 'resizing' = '(?i)resiz'
        'Alt+Tab keyboard focus' = '(?i)alt\+tab'; 'views drawn over each other' = '(?i)(z-order|overlap)'
        'blank pages' = '(?i)blank'; 'text-editing shortcuts' = '(?i)shortcut'
        'which processes belong to the app' = '(?i)job object'
    }
    $missing = @($checks.Keys | Where-Object { $re = $checks[$_]; -not ($lines | Where-Object { $_ -match $re -and $_ -match '\b(PASS|FAIL)\b' }) })
    if ($missing.Count) { Stop-Fail "No PASS/FAIL row for: $($missing -join '; ')." }
    "$($checks.Count) rows found"
}

Invoke-Step 'The experiment app builds' {
    $folder = if (Test-Path -LiteralPath (Get-RepoPath 'spikes/s1-multiwebview/src-tauri/Cargo.toml')) { 'spikes/s1-multiwebview/src-tauri' } else { 'spikes/s1-multiwebview' }
    [void](Assert-Cargo @('build', '--locked') -Folder $folder)
    "cargo build --locked in $folder"
}

Complete-Check -SaveEvidence:$SaveEvidence
