#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p7.2 (P7 Smart tab sleeping): Signals for sleep decisions.  DRAFT: not ready until P7.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P7 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) Each signal has tests with fake inputs and with a test page; its limits are
                   written down.
  Why            : Good decisions need inputs → measure last use, memory pressure, tab activity, cost to
                   restore, media playing, downloads, your exclusions and unsaved forms → each strategy
                   decides on real signals with known limits.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p7.2-signals-sleep-decisions.ps1
  Result         : NOT READY = exit 2 until P7; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P7" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Each provider has unit tests with mocked inputs and an integration test against a fixture (media
    fixture, download fixture, form fixture); limits recorded on comp-resource-manager.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p7.2' -Title 'Signals for sleep decisions' -Phase 'phase-p7-lifecycle' `
    -Why 'each strategy decides on real signals with known limits.'

# TODO(P7): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Each signal has tests with fake inputs and with a test page' 'Planned check; written when P7 starts.'
Add-TodoStep 'Its limits are written down' 'Planned check; written when P7 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P7'
