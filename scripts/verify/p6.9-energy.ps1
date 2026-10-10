#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p6.9 (P6 Benchmarks): Energy, only if it can be measured honestly.  DRAFT: not ready until P6.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P6 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) A dry run gives energy samples with units, or the energy measurements show
                   unsupported with the reason.
  Why            : Energy use is worth reporting but hard to measure → if you approve, a separate
                   admin-level reader collects CPU energy counters (labelled modelled, CPU only), or a
                   wall-power meter is used → otherwise energy is marked unsupported, never estimated.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p6.9-energy.ps1
  Result         : NOT READY = exit 2 until P6; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P6" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Either a dry run produces energy samples with documented units and wrap handling, or the metric pages
    show support unsupported with the reason; never an estimate.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p6.9' -Title 'Energy, only if it can be measured honestly' -Phase 'phase-p6-benchmark-harness' `
    -Why 'otherwise energy is marked unsupported, never estimated.'

# TODO(P6): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'A dry run gives energy samples with units, or the energy measurements show unsupported with the reason' 'Planned check; written when P6 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P6'
