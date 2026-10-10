#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p4.7 (P4 Security): Prove what is really isolated.  DRAFT: not ready until P4.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P4 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) Site A's data is unreadable from B; clearing A leaves B intact; the shared
                   list cites evidence.
  Why            : Profiles share browser processes → test what is truly separate (cookies, storage,
                   databases) and list what is shared → no claim of full isolation without evidence.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p4.7-prove-isolated.ps1
  Result         : NOT READY = exit 2 until P4; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P4" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Security tests: cookies, localStorage and IndexedDB written by site A are not readable by site B in a
    different profile; clearing profile A leaves profile B intact; shared-resource list on
    comp-webview-manager cites the evidence.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p4.7' -Title 'Prove what is really isolated' -Phase 'phase-p4-security' `
    -Why 'no claim of full isolation without evidence.'

# TODO(P4): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Site A''s data is unreadable from B' 'Planned check; written when P4 starts.'
Add-TodoStep 'Clearing A leaves B intact' 'Planned check; written when P4 starts.'
Add-TodoStep 'The shared list cites evidence' 'Planned check; written when P4 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P4'
