#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.8 (P3 Tabs and sessions): Basic downloads.  DRAFT: not ready until P3.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P3 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) A test file arrives with the right size and fingerprint; a failing one shows
                   an error.
  Why            : Files must land somewhere sensible → default folder or a prompt, with progress and
                   errors → downloads are visible.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p3.8-basic-downloads.ps1
  Result         : NOT READY = exit 2 until P3; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P3" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Integration test downloads a fixture file and checks size and hash; failure fixture shows the error
    state.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p3.8' -Title 'Basic downloads' -Phase 'phase-p3-tabs-sessions' `
    -Why 'downloads are visible.'

# TODO(P3): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'A test file arrives with the right size and fingerprint' 'Planned check; written when P3 starts.'
Add-TodoStep 'A failing one shows an error' 'Planned check; written when P3 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P3'
