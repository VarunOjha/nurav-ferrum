#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.11 (P3 Tabs and sessions): One integration suite.  DRAFT: not ready until P3.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P3 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) The suite passes; output saved.
  Why            : Many features → one command runs every P3 test → a single green run proves the
                   milestone.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p3.11-integration-suite.ps1
  Result         : NOT READY = exit 2 until P3; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P3" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    One command runs the suite and exits 0; output saved.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p3.11' -Title 'One integration suite' -Phase 'phase-p3-tabs-sessions' `
    -Why 'a single green run proves the milestone.'

# TODO(P3): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'The suite passes' 'Planned check; written when P3 starts.'
Add-TodoStep 'Output saved' 'Planned check; written when P3 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P3'
