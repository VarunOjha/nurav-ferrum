#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p1.7 (P1 Foundation): Experiment 3, low-level WebView2 calls.

.DESCRIPTION
  What it checks : the experiment uses exactly one version of each low-level Windows library that Tauri also
                   uses (two versions would mean two copies of the same Windows code), and its report (spike-s3-raw-com.md) logs the result code of each call and drafts
                   the safety rules for each one.
  Why            : suspend, memory limits and crash events are only reachable below Tauri → we learn which
                   lifecycle and security features are possible, and how to call them safely.
  What it changes: nothing. It only reads the experiment's list of libraries.
  How long       : about 5 seconds.
  How to run     : pwsh -NoProfile -File scripts/verify/p1.7-spike-raw-com.ps1
                   (the Rust project in spikes/s3-raw-com/src-tauri, or directly in spikes/s3-raw-com)
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p1.7 check failed".
  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). Libraries: webview2-com and windows (cargo tree -i).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p1.7' -Title 'Experiment 3: low-level WebView2 calls' -Phase 'phase-p1-foundation' `
    -Why 'we must know which low-level features are possible, and how to call them safely.'

# The Rust project sits in src-tauri/ (Tauri's layout) or directly in the spike folder.
$folder = if (Test-Path -LiteralPath (Get-RepoPath 'spikes/s3-raw-com/src-tauri/Cargo.toml')) { 'spikes/s3-raw-com/src-tauri' } else { 'spikes/s3-raw-com' }
$report = 'wiki/raw/evidence/phase-p1-foundation/spike-s3-raw-com.md'

foreach ($lib in 'webview2-com', 'windows') {
    Invoke-Step "Only one version of the '$lib' library" {
        # 'cargo tree -i' fails when two versions exist ("multiple packages"), so exit 0 means one version.
        $r = Assert-Cargo @('tree', '-i', $lib, '--edges', 'normal', '--depth', '0') -Folder $folder
        ($r.Output -split "`r?`n" | Select-Object -First 1)
    }
}

Invoke-Step 'The report logs each call result and drafts safety rules' {
    $t = Read-RepoText $report
    if ($t -notmatch 'HRESULT|0x[0-9A-Fa-f]{8}') { Stop-Fail 'The report logs no call result codes (HRESULT).' }
    if ($t -notmatch '(?i)(invariant|safety rule)') { Stop-Fail 'The report drafts no safety rules (invariants) for the calls.' }
    'call results and safety rules present'
}

Complete-Check -SaveEvidence:$SaveEvidence
