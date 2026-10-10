#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.4 (P3 Tabs and sessions): Saved settings and startup sites.  DRAFT: not ready until P3.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P3 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) Round trip works; a future version is refused clearly; a corrupt file falls
                   back with a backup; startup sites open in order.
  Why            : Settings must survive crashes and upgrades → a versioned file, written safely, with
                   migration → never lost or half-written.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p3.4-saved-settings-startup.ps1
  Result         : NOT READY until P3 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P3" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    Unit tests: round trip, unknown future version refused with a clear error, corrupted file falls back
    to defaults and keeps a backup; integration test: startup sites open in order.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p3.4' -Title 'Saved settings and startup sites' -Phase 'phase-p3-tabs-sessions' `
    -Why 'never lost or half-written.'

# TODO(P3): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Round trip works' 'Planned check; written when P3 starts.'
Add-TodoStep 'A future version is refused clearly' 'Planned check; written when P3 starts.'
Add-TodoStep 'A corrupt file falls back with a backup' 'Planned check; written when P3 starts.'
Add-TodoStep 'Startup sites open in order' 'Planned check; written when P3 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P3'
