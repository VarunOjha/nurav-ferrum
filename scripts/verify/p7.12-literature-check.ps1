#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p7.12 (P7 Smart tab sleeping): Literature check: what is really new.  DRAFT: not ready until P7.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P7 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) Every close earlier work is listed with a verified source and what differs;
                   your approval recorded.
  Why            : Similar ideas exist (Chrome and Edge tab sleeping, Android app standby, cost-aware
                   caching) → compare our approach with each, using verified sources, and you approve the
                   assessment → the paper claims only what is truly new.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p7.12-literature-check.ps1
  Result         : NOT READY until P7 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P7" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    Novelty assessment page lists every close prior-art item with a verified source and states what, if
    anything, differs; owner approval recorded; P8 may not frame novelty without it.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p7.12' -Title 'Literature check: what is really new' -Phase 'phase-p7-lifecycle' `
    -Why 'the paper claims only what is truly new.'

# TODO(P7): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Every close earlier work is listed with a verified source and what differs' 'Planned check; written when P7 starts.'
Add-TodoStep 'Your approval recorded' 'Planned check; written when P7 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P7'
