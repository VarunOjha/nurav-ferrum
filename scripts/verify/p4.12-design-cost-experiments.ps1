#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p4.12 (P4 Security): Design the cost experiments.  DRAFT: not ready until P4.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P4 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) Small timing tests run (proof the tool works, not results); experiment pages
                   updated; you approve them.
  Why            : Security costs time and memory → build small timing tests and finish the experiment
                   designs, claiming no numbers → P6 measures it properly.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p4.12-design-cost-experiments.ps1
  Result         : NOT READY = exit 2 until P4; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P4" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Microbenchmarks run and save raw output as evidence of harness operation only (no claims); experiment
    pages updated with workloads, metrics and analysis plan; owner approves them.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p4.12' -Title 'Design the cost experiments' -Phase 'phase-p4-security' `
    -Why 'p6 measures it properly.'

# TODO(P4): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Small timing tests run (proof the tool works, not results)' 'Planned check; written when P4 starts.'
Add-TodoStep 'Experiment pages updated' 'Planned check; written when P4 starts.'
Add-TodoStep 'You approve them' 'Planned check; written when P4 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P4'
