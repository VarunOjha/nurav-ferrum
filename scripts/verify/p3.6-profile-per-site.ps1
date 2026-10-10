#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.6 (P3 Tabs and sessions): Separate profile per site.  DRAFT: not ready until P3.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P3 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) Two sites in different profiles cannot see each other's cookies; one site in
                   two tabs shares one profile; survives restart.
  Why            : Sites should not see each other's data → assign profiles using the route chosen in P1 →
                   cookies stay apart.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p3.6-profile-per-site.ps1
  Result         : NOT READY until P3 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P3" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    Integration test: two fixture sites mapped to different profiles do not see each other's cookies; same
    site in two tabs shares one profile; settings survive restart.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p3.6' -Title 'Separate profile per site' -Phase 'phase-p3-tabs-sessions' `
    -Why 'cookies stay apart.'

# TODO(P3): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Two sites in different profiles cannot see each other''s cookies' 'Planned check; written when P3 starts.'
Add-TodoStep 'One site in two tabs shares one profile' 'Planned check; written when P3 starts.'
Add-TodoStep 'Survives restart' 'Planned check; written when P3 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P3'
