#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p2.6 (P2 First working app): Show a website and track it.  DRAFT: not ready until P2.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P2 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) A test visits two pages; the shell receives address and load events in order.
  Why            : The shell must know where the page is → create the website view and report address and
                   loading state → the address bar and spinner are always right.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p2.6-show-website.ps1
  Result         : NOT READY = exit 2 until P2; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P2" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Integration test navigates to two fixture pages and asserts the shell receives URL and load-state
    events in order.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p2.6' -Title 'Show a website and track it' -Phase 'phase-p2-minimal-container' `
    -Why 'the address bar and spinner are always right.'

# TODO(P2): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'A test visits two pages' 'Planned check; written when P2 starts.'
Add-TodoStep 'The shell receives address and load events in order' 'Planned check; written when P2 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P2'
