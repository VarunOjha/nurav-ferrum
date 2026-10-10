#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p5.8 (P5 Measurement): Record tab state changes.  DRAFT: not ready until P5.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P5 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) Switching tabs produces hide and show records that pass the format check.
  Why            : Smart tab sleeping in P7 needs a record of every tab state change → define the record
                   (from, to, why, when, which tab) and log hide and show now → P7 plugs in without a new
                   format.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p5.8-record-tab-state.ps1
  Result         : NOT READY until P5 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P5" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    Unit test writes and validates transition records; integration test sees hide/show records when
    switching tabs.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p5.8' -Title 'Record tab state changes' -Phase 'phase-p5-telemetry' `
    -Why 'p7 plugs in without a new format.'

# TODO(P5): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Switching tabs produces hide and show records that pass the format check' 'Planned check; written when P5 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P5'
