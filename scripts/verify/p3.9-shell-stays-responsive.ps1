#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.9 (P3 Tabs and sessions): Shell stays responsive.  DRAFT: not ready until P3.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P3 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) Switching and typing finish within the test's time limit (a requirement, not
                   a measurement).
  Why            : A busy tab must not freeze the browser → switch tabs and type while another tab burns
                   CPU → the shell stays usable.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p3.9-shell-stays-responsive.ps1
  Result         : NOT READY = exit 2 until P3; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P3" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Smoke test: with a busy-loop fixture in tab A, switching to tab B and typing in the address bar
    completes within the test timeout defined in the test (a requirement threshold, not a measurement
    result); result recorded.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p3.9' -Title 'Shell stays responsive' -Phase 'phase-p3-tabs-sessions' `
    -Why 'the shell stays usable.'

# TODO(P3): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Switching and typing finish within the test''s time limit (a requirement, not a measurement)' 'Planned check; written when P3 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P3'
