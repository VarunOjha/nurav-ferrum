#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p5.7 (P5 Measurement): Page-load timing.  DRAFT: not ready until P5.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P5 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) Test pages with known redirects give the right redirect count and timing
                   order.
  Why            : Page-load speed is another key result → record each load's main moments, whether it
                   crossed to another site, and how many redirects it took → page loads can be compared
                   fairly in P6.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p5.7-page-load-timing.ps1
  Result         : NOT READY = exit 2 until P5; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P5" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Integration test with the P2 redirect fixtures asserts the redirect count and ordering of timestamps.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p5.7' -Title 'Page-load timing' -Phase 'phase-p5-telemetry' `
    -Why 'page loads can be compared fairly in P6.'

# TODO(P5): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Test pages with known redirects give the right redirect count and timing order' 'Planned check; written when P5 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P5'
