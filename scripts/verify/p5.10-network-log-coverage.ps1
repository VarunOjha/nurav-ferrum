#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p5.10 (P5 Measurement): Network log: coverage and cost.  DRAFT: not ready until P5.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P5 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) A coverage table and the cost-trial output are saved as evidence.
  Why            : Some requests may be missed (embedded frames, redirects, background workers) → test
                   each kind and run a small cost trial → the paper states exactly what the log covers.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p5.10-network-log-coverage.ps1
  Result         : NOT READY = exit 2 until P5; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P5" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Coverage table on comp-network-logger cites the test outputs; overhead pilot raw output saved.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p5.10' -Title 'Network log: coverage and cost' -Phase 'phase-p5-telemetry' `
    -Why 'the paper states exactly what the log covers.'

# TODO(P5): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'A coverage table and the cost-trial output are saved as evidence' 'Planned check; written when P5 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P5'
