#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p4.13 (P4 Security): Literature batch 4.  DRAFT: not ready until P4.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P4 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) New dated notes.
  Why            : The paper needs security context → read site-isolation and embedded-browser security
                   studies → the trade-offs are grounded.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p4.13-literature-batch-4.ps1
  Result         : NOT READY = exit 2 until P4; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P4" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    New raw research notes with access dates.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p4.13' -Title 'Literature batch 4' -Phase 'phase-p4-security' `
    -Why 'the trade-offs are grounded.'

# TODO(P4): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'New dated notes' 'Planned check; written when P4 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P4'
