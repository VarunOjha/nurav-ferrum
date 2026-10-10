#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p6.7 (P6 Benchmarks): Record the setup and pin versions.  DRAFT: not ready until P6.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P6 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) A dry-run record has every field; a test flags a version change between two
                   trials.
  Why            : A silent browser update mid-campaign would spoil the data → record Windows build,
                   product versions, power plan and background apps for each run, and pin browser versions
                   → any change is caught and flagged.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p6.7-record-setup.ps1
  Result         : NOT READY = exit 2 until P6; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P6" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Run manifest of a dry run contains every listed field; a version change between two trials of one
    campaign is flagged by a test.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p6.7' -Title 'Record the setup and pin versions' -Phase 'phase-p6-benchmark-harness' `
    -Why 'any change is caught and flagged.'

# TODO(P6): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'A dry-run record has every field' 'Planned check; written when P6 starts.'
Add-TodoStep 'A test flags a version change between two trials' 'Planned check; written when P6 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P6'
