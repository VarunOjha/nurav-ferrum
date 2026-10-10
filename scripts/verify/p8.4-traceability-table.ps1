#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p8.4 (P8 Research paper): Trace from question to conclusion.  DRAFT: not ready until P8.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P8 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) No empty cell for any reported conclusion; the wiki link checks are clean.
  Why            : Each conclusion must rest on evidence → build a table linking question → prediction →
                   experiment → raw data → analysis → figure → conclusion, shown in this portal → gaps are
                   visible at a glance.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p8.4-traceability-table.ps1
  Result         : NOT READY until P8 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P8" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    Matrix has no empty cell for any reported conclusion; wiki lint REF-RECIPROCAL and HYP-NO-DATA clean.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p8.4' -Title 'Trace from question to conclusion' -Phase 'phase-p8-research-paper' `
    -Why 'gaps are visible at a glance.'

# TODO(P8): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'No empty cell for any reported conclusion' 'Planned check; written when P8 starts.'
Add-TodoStep 'The wiki link checks are clean' 'Planned check; written when P8 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P8'
