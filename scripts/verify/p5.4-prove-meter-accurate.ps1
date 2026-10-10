#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p5.4 (P5 Measurement): Prove the meter is accurate.  DRAFT: not ready until P5.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P5 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) Readings fall within the tolerances written beforehand; raw outputs saved as
                   evidence.
  Why            : A meter is only useful if it is right → helper programs use a known amount of memory
                   and CPU; the meter and an independent reader are compared with those values, with
                   tolerances written down before the run → a meter that fails blocks P6.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p5.4-prove-meter-accurate.ps1
  Result         : NOT READY until P5 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P5" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    Validation tests pass within tolerances written in the test before it is run; raw outputs saved as
    evidence; tolerances and any failure recorded on the metric pages.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p5.4' -Title 'Prove the meter is accurate' -Phase 'phase-p5-telemetry' `
    -Why 'a meter that fails blocks P6.'

# TODO(P5): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Readings fall within the tolerances written beforehand' 'Planned check; written when P5 starts.'
Add-TodoStep 'Raw outputs saved as evidence' 'Planned check; written when P5 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P5'
