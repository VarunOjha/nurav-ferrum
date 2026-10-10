#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p7.5 (P7 Smart tab sleeping): Three simple strategies.  DRAFT: not ready until P7.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P7 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) Tests per strategy on scripted timelines pass; one build switches strategy by
                   setting.
  Why            : We need baselines to compare against → build never sleep, sleep after a fixed idle
                   time, and sleep under memory pressure, switchable by a setting → one app runs every
                   strategy, so only the strategy differs.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p7.5-three-simple-strategies.ps1
  Result         : NOT READY until P7 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P7" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    Unit tests per policy on scripted signal timelines; config selection test proves the same binary
    switches strategy by flag.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p7.5' -Title 'Three simple strategies' -Phase 'phase-p7-lifecycle' `
    -Why 'one app runs every strategy, so only the strategy differs.'

# TODO(P7): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Tests per strategy on scripted timelines pass' 'Planned check; written when P7 starts.'
Add-TodoStep 'One build switches strategy by setting' 'Planned check; written when P7 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P7'
