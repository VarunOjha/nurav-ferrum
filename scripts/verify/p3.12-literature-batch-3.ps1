#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.12 (P3 Tabs and sessions): Literature batch 3.  DRAFT: not ready until P3.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P3 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) New dated notes; uncertain seed entries checked or still flagged.
  Why            : Tab lifecycle is the core research idea → read tab-usage studies and Chrome and Edge
                   lifecycle policies → prior art for P7.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p3.12-literature-batch-3.ps1
  Result         : NOT READY = exit 2 until P3; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P3" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    New raw research notes with access dates; seed-list entries marked UNCERTAIN are either verified or
    still flagged.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p3.12' -Title 'Literature batch 3' -Phase 'phase-p3-tabs-sessions' `
    -Why 'prior art for P7.'

# TODO(P3): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'New dated notes' 'Planned check; written when P3 starts.'
Add-TodoStep 'Uncertain seed entries checked or still flagged' 'Planned check; written when P3 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P3'
