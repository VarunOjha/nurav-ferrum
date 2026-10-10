#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p5.6 (P5 Measurement): Startup timing.  DRAFT: not ready until P5.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P5 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) On a test page every moment is recorded, in the right order.
  Why            : Startup speed is a key result → record when the process starts, the window appears, and
                   the first and largest content are drawn, read by Ferrum itself through the browser's
                   debugging channel → startup can be compared fairly in P6.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p5.6-startup-timing.ps1
  Result         : NOT READY = exit 2 until P5; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P5" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Integration test on a fixture page asserts every boundary is present and ordered (creation before
    visible before FCP before LCP); boundary definitions match the metric pages.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p5.6' -Title 'Startup timing' -Phase 'phase-p5-telemetry' `
    -Why 'startup can be compared fairly in P6.'

# TODO(P5): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'On a test page every moment is recorded, in the right order' 'Planned check; written when P5 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P5'
