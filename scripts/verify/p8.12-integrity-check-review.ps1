#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p8.12 (P8 Research paper): Integrity check and your review.  DRAFT: not ready until P8.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P8 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) The checklist is saved, the wiki check is clean, and you approve the end of
                   P8.
  Why            : The paper is drafted → a checklist confirms no invented facts, versions, measurements,
                   citations or novelty → you read the paper and approve the end of P8.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p8.12-integrity-check-review.ps1
  Result         : NOT READY = exit 2 until P8; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P8" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Checklist completed and saved; lint clean; owner approves phase-p8-research-paper#exit.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p8.12' -Title 'Integrity check and your review' -Phase 'phase-p8-research-paper' `
    -Why 'you read the paper and approve the end of P8.'

# TODO(P8): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'The checklist is saved, the wiki check is clean, and you approve the end of P8' 'Planned check; written when P8 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P8'
