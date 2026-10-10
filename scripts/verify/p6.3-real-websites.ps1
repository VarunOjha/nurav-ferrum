#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p6.3 (P6 Benchmarks): A few real websites as extras.  DRAFT: not ready until P6.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P6 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) A dry run records the response and page size for each site; no results drawn
                   from it.
  Why            : Local pages may not reflect real use → pick a short list of public sites without login,
                   with the visit date recorded → a reality check, clearly labelled extra, never the main
                   result.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p6.3-real-websites.ps1
  Result         : NOT READY until P6 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P6" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    List on the workload pages; a dry run records status codes and page sizes for each site (evidence), no
    results drawn from it.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p6.3' -Title 'A few real websites as extras' -Phase 'phase-p6-benchmark-harness' `
    -Why 'a reality check, clearly labelled extra, never the main result.'

# TODO(P6): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'A dry run records the response and page size for each site' 'Planned check; written when P6 starts.'
Add-TodoStep 'No results drawn from it' 'Planned check; written when P6 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P6'
