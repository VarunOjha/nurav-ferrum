#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p7.4 (P7 Smart tab sleeping): Safety guards.  DRAFT: not ready until P7.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P7 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) Guarded test pages are never closed under any strategy, even under memory
                   pressure; each refusal is logged.
  Why            : Closing a tab mid-task can lose your work → never close a tab while media plays, a
                   download runs, a form is unsaved, the page asks before leaving, or you excluded the
                   site → sleeping never costs you data.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p7.4-safety-guards.ps1
  Result         : NOT READY until P7 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P7" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    Safety tests: each guard fixture is never discarded under any policy, including under simulated memory
    pressure; each refusal is logged as a transition record with reason.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p7.4' -Title 'Safety guards' -Phase 'phase-p7-lifecycle' `
    -Why 'sleeping never costs you data.'

# TODO(P7): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Guarded test pages are never closed under any strategy, even under memory pressure' 'Planned check; written when P7 starts.'
Add-TodoStep 'Each refusal is logged' 'Planned check; written when P7 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P7'
