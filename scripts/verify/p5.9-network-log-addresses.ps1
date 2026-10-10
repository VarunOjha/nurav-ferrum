#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p5.9 (P5 Measurement): Network log: addresses and timings only.  DRAFT: not ready until P5.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P5 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) A test page with known requests gives exactly the expected entries; a test
                   proves no headers or content are stored.
  Why            : You asked for a log of network calls → per tab, save address, method, result, type,
                   timing, size and the security decision to one folder per session, never headers or page
                   content → useful for research without storing private data.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p5.9-network-log-addresses.ps1
  Result         : NOT READY = exit 2 until P5; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P5" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Integration test: fixture page with a known set of resources (including one cross-origin iframe and
    one fetch) produces exactly the expected entries; a negative test asserts no header or body fields
    exist in any record.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p5.9' -Title 'Network log: addresses and timings only' -Phase 'phase-p5-telemetry' `
    -Why 'useful for research without storing private data.'

# TODO(P5): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'A test page with known requests gives exactly the expected entries' 'Planned check; written when P5 starts.'
Add-TodoStep 'A test proves no headers or content are stored' 'Planned check; written when P5 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P5'
