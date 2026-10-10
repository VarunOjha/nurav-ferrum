#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p2.4 (P2 First working app): Settings model.  DRAFT: not ready until P2.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P2 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) Tests: valid file, missing file, bad address, non-HTTPS start page.
  Why            : Start page, navigation rules and data folder must be valid → typed settings with safe
                   defaults → bad settings never crash or weaken the app.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p2.4-settings-model.ps1
  Result         : NOT READY until P2 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P2" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    Unit tests cover valid config, missing file (defaults), invalid URL, non-https start URL handling per
    adr-0015.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p2.4' -Title 'Settings model' -Phase 'phase-p2-minimal-container' `
    -Why 'bad settings never crash or weaken the app.'

# TODO(P2): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Tests: valid file, missing file, bad address, non-HTTPS start page' 'Planned check; written when P2 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P2'
