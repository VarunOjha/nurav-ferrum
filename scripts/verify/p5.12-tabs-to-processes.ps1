#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p5.12 (P5 Measurement): Map tabs to browser processes.  DRAFT: not ready until P5.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P5 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) Findings saved as evidence; each open assumption confirmed or moved to a
                   later phase.
  Why            : Tabs may share browser processes → check how each tab shows up and which processes
                   serve it → P6 and P7 know how far per-tab numbers can be trusted.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p5.12-tabs-to-processes.ps1
  Result         : NOT READY = exit 2 until P5; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P5" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Findings written to a raw evidence note and linked from comp-telemetry; affected UNVERIFIED tags
    resolved or re-targeted.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p5.12' -Title 'Map tabs to browser processes' -Phase 'phase-p5-telemetry' `
    -Why 'p6 and P7 know how far per-tab numbers can be trusted.'

# TODO(P5): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Findings saved as evidence' 'Planned check; written when P5 starts.'
Add-TodoStep 'Each open assumption confirmed or moved to a later phase' 'Planned check; written when P5 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P5'
