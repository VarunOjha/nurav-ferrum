#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p7.8 (P7 Smart tab sleeping): Long-running test.  DRAFT: not ready until P7.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P7 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) Raw output saved; every crash or failed restore has a fix and a test.
  Why            : Some problems only show up over hours → run many background tabs for a long session
                   under each strategy, watching memory growth, crashes and restores → every bug found is
                   fixed, with a test, before the campaign.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p7.8-long-running-test.ps1
  Result         : NOT READY until P7 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P7" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    Soak run raw output saved; any crash or failed restore becomes a bug with a regression test before C2.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p7.8' -Title 'Long-running test' -Phase 'phase-p7-lifecycle' `
    -Why 'every bug found is fixed, with a test, before the campaign.'

# TODO(P7): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Raw output saved' 'Planned check; written when P7 starts.'
Add-TodoStep 'Every crash or failed restore has a fix and a test' 'Planned check; written when P7 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P7'
