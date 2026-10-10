#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p2.5 (P2 First working app): Clean up address-bar input.  DRAFT: not ready until P2.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P2 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) One test per input type (no scheme, http, foreign letters, IPv6, script, data
                   and file links, junk) passes.
  Why            : People type anything → one tested function turns input into a safe address or refuses
                   it → malformed input never navigates.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p2.5-address-input.ps1
  Result         : NOT READY = exit 2 until P2; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P2" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Table-driven unit tests with at least one case per listed input class pass; malformed input never
    yields a navigation.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p2.5' -Title 'Clean up address-bar input' -Phase 'phase-p2-minimal-container' `
    -Why 'malformed input never navigates.'

# TODO(P2): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'One test per input type (no scheme, http, foreign letters, IPv6, script, data and file links, junk) passes' 'Planned check; written when P2 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P2'
