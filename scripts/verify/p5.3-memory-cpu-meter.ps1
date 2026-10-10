#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p5.3 (P5 Measurement): Memory and CPU meter.  DRAFT: not ready until P5.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P5 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) Tests confirm totals and peaks are computed correctly.
  Why            : We need trustworthy memory and CPU numbers → read them straight from Windows (private
                   memory as the headline, working set as secondary, CPU time) and add them up over
                   Ferrum's processes → one fair total per moment; peaks come from the total, never from
                   adding per-process peaks.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p5.3-memory-cpu-meter.ps1
  Result         : NOT READY until P5 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P5" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    Unit tests on aggregation logic (sum of private commit across the set; peak computed from the summed
    series, never a sum of per-process peaks).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p5.3' -Title 'Memory and CPU meter' -Phase 'phase-p5-telemetry' `
    -Why 'one fair total per moment; peaks come from the total, never from adding per-process peaks.'

# TODO(P5): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Tests confirm totals and peaks are computed correctly' 'Planned check; written when P5 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P5'
