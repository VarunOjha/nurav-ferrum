#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p8.8 (P8 Research paper): Verify every citation.  DRAFT: not ready until P8.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P8 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) The citation check shows zero unresolved entries and none from the
                   do-not-cite list.
  Why            : A wrong citation damages trust → a script confirms each reference against its source or
                   its permanent paper ID (DOI) → no unverified or banned references.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p8.8-verify-every-citation.ps1
  Result         : NOT READY = exit 2 until P8; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P8" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Citation check script output saved with zero unresolved entries; no entry from the related-work 'do
    not cite' list.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p8.8' -Title 'Verify every citation' -Phase 'phase-p8-research-paper' `
    -Why 'no unverified or banned references.'

# TODO(P8): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'The citation check shows zero unresolved entries and none from the do-not-cite list' 'Planned check; written when P8 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P8'
