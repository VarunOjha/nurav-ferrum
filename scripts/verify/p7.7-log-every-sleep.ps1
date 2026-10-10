#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p7.7 (P7 Smart tab sleeping): Log every sleep decision.  DRAFT: not ready until P7.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P7 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) A scripted close and restore produce the expected records and a restore-time
                   record.
  Why            : We must see what each strategy did → record every state change and refusal, and the
                   time from restore to first content → behaviour and restore delay become measurable.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p7.7-log-every-sleep.ps1
  Result         : NOT READY = exit 2 until P7; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P7" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Integration test asserts transition records for a scripted discard and restore and a restoration
    latency record.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p7.7' -Title 'Log every sleep decision' -Phase 'phase-p7-lifecycle' `
    -Why 'behaviour and restore delay become measurable.'

# TODO(P7): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'A scripted close and restore produce the expected records and a restore-time record' 'Planned check; written when P7 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P7'
