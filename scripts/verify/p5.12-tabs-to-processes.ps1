#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p5.12 (P5 Measurement): Which browser process serves each tab.

.DESCRIPTION
  What it checks : live, in two ways of keeping sites apart (one browser engine with a profile per site; an engine per
                   site): Ferrum opens four tabs (two of site A, one of site B, one page with a frame of site B), then
                   records (1) what the benchmark debugging port lists (tabs, frames, Ferrum's own toolbar), (2) which
                   page process draws each tab and the frame, and whether any is shared, and (3) which process started
                   each browser process. Saved as evidence; the component page links the reading of it.
  Why            : Tabs may share browser processes → check how each tab shows up and which processes serve it → P6
                   and P7 know how far per-tab numbers can be trusted.
  What it changes: nothing. It starts Ferrum twice; it closes by itself (nothing is killed).
  How long       : about 2 minutes (longer the first time, while Rust compiles).
  How to run     : pwsh -NoProfile -File scripts/verify/p5.12-tabs-to-processes.ps1   (do not use the PC meanwhile)
  Result         : PASS or FAIL (the line says what).
  Tell Claude    : "p5.12 check passed", or paste the FAIL lines.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    -SaveEvidence also writes wiki/raw/evidence/phase-p5-telemetry/devtools-targets-p5.12.json.
    Phase-page verify field: Findings written to a raw evidence note and linked from comp-telemetry; affected
    UNVERIFIED tags resolved or re-targeted.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p5.12' -Title 'Which browser process serves each tab' -Phase 'phase-p5-telemetry' `
    -Why 'P6 and P7 know how far per-tab numbers can be trusted.'

$cargoBin = Join-Path $env:USERPROFILE '.cargo/bin'
if ((Test-Path -LiteralPath $cargoBin) -and ($env:PATH -notlike "*$cargoBin*")) { $env:PATH = "$cargoBin;$env:PATH" }
$script:Found = @()

Invoke-Step 'Live: debugging-port targets, renderer per tab and frame, process parents (both isolation modes)' {
    $r = Invoke-FerrumSmoke -Spec @('devtools-targets')
    Add-LogText (Get-Tail $r.Output 8)
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '2 passed') { Stop-Fail "The live run failed:`n$(Get-Tail $r.Output 30)" }
    $lines = @($r.Output -split "`r?`n" | Where-Object { $_ -match 'TARGETS-JSON ' })
    if ($lines.Count -ne 2) { Stop-Fail "Expected 2 TARGETS-JSON lines, got $($lines.Count)." }
    $script:Found = @($lines | ForEach-Object { $_.Substring($_.IndexOf('TARGETS-JSON ') + 13) | ConvertFrom-Json })
    $rows = foreach ($m in $script:Found) {
        $pages = @($m.port_targets | Where-Object { $_.type -eq 'page' }).Count
        $frames = @($m.port_targets | Where-Object { $_.type -eq 'iframe' }).Count
        $shell = [bool]($m.port_targets | Where-Object { $_.url -like 'http://tauri.localhost*' })
        $own = @($m.parents | Where-Object { $_.kind -eq 'browser' -and $_.parent -eq 'ferrum' }).Count
        $other = @($m.parents | Where-Object { $_.kind -ne 'browser' -and $_.parent -ne 'browser' }).Count
        '{0}: port lists {1} pages and {2} frames (shell listed: {3}); {4} tabs with their own renderer, {5} shared; frame renderer {6}; {7} engines started by Ferrum, {8} processes with another parent' -f `
            $m.mode, $pages, $frames, $shell, @($m.tabs | Where-Object { $_.renderers.Count -eq 1 }).Count, @($m.shared_renderers).Count, ($m.frame.renderers -join ','), $own, $other
    }
    $rows -join "`n"
}

if ($SaveEvidence -and $script:Found.Count -eq 2) {
    [void](Save-Evidence -Path 'wiki/raw/evidence/phase-p5-telemetry/devtools-targets-p5.12.json' -Text ($script:Found | ConvertTo-Json -Depth 8))
}
Complete-Check -SaveEvidence:$SaveEvidence
