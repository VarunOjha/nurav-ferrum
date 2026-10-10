#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p2.10 (P2 First working app): New windows and outside links.  DRAFT: not ready until P2.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P2 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) The new-window test follows the setting; the mail-link test asks and launches
                   nothing without consent.
  Why            : Links open new windows or other apps such as mail → follow the setting, and ask before
                   handing off to another app → nothing launches without your consent.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p2.10-new-windows-links.ps1
  Result         : NOT READY until P2 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P2" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    Smoke tests: _blank fixture follows the configured behaviour; scheme fixture shows the confirmation
    and does not launch without consent (launcher mocked in test).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p2.10' -Title 'New windows and outside links' -Phase 'phase-p2-minimal-container' `
    -Why 'nothing launches without your consent.'

# TODO(P2): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'The new-window test follows the setting' 'Planned check; written when P2 starts.'
Add-TodoStep 'The mail-link test asks and launches nothing without consent' 'Planned check; written when P2 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P2'
