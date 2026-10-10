#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p5.11 (P5 Measurement): Settings for measuring and logging.  DRAFT: not ready until P5.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P5 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) A quick test flips each switch and confirms files are or are not written.
  Why            : You decide what is recorded → add on/off switches for measurement and the network log,
                   a button to open the log folder, and a retention limit → nothing is recorded that you
                   did not choose.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p5.11-settings-measuring-logging.ps1
  Result         : NOT READY = exit 2 until P5; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P5" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Smoke test toggles each setting and asserts files are or are not written.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p5.11' -Title 'Settings for measuring and logging' -Phase 'phase-p5-telemetry' `
    -Why 'nothing is recorded that you did not choose.'

# TODO(P5): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'A quick test flips each switch and confirms files are or are not written' 'Planned check; written when P5 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P5'
