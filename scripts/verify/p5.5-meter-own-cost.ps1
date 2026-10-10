#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p5.5 (P5 Measurement): Measure the meter's own cost.  DRAFT: not ready until P5.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P5 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) Raw outputs saved as evidence; no comparison claims made.
  Why            : Measuring uses some CPU and memory itself → measure the meter's own cost at each
                   sampling speed → we know how much it disturbs results (this describes the tool, not
                   Ferrum).
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p5.5-meter-own-cost.ps1
  Result         : NOT READY until P5 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P5" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    Raw outputs saved under raw/evidence/phase-p5-telemetry/; telemetry quality page cites them; no
    comparison claim made.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p5.5' -Title 'Measure the meter''s own cost' -Phase 'phase-p5-telemetry' `
    -Why 'we know how much it disturbs results (this describes the tool, not Ferrum).'

# TODO(P5): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Raw outputs saved as evidence' 'Planned check; written when P5 starts.'
Add-TodoStep 'No comparison claims made' 'Planned check; written when P5 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P5'
