#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p4.8 (P4 Security): No app access for websites.  DRAFT: not ready until P4.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P4 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) Every listed path fails from a remote test page.
  Why            : Websites must not reach app internals → test every channel, including one internal
                   command the permission system skips, and block loading the app's own pages → native
                   access stays closed.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p4.8-no-app-access.ps1
  Result         : NOT READY = exit 2 until P4; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P4" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Security tests from a remote-origin fixture for each listed path all fail; a test attempts top-level
    navigation of a tab to the app's local origin and it is blocked.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p4.8' -Title 'No app access for websites' -Phase 'phase-p4-security' `
    -Why 'native access stays closed.'

# TODO(P4): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Every listed path fails from a remote test page' 'Planned check; written when P4 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P4'
