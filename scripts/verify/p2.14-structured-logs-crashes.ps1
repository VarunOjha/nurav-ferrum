#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p2.14 (P2 First working app): Structured logs, no crashes.  DRAFT: not ready until P2.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P2 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) Every log line can be read by a program; no crash entries.
  Why            : Problems need evidence → Machine-readable log lines and clear errors, no crashing on
                   bad navigation → failures can be diagnosed.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p2.14-structured-logs-crashes.ps1
  Result         : NOT READY = exit 2 until P2; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P2" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Log file produced in a smoke run parses as JSON lines; grep shows no 'panicked' entries.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p2.14' -Title 'Structured logs, no crashes' -Phase 'phase-p2-minimal-container' `
    -Why 'failures can be diagnosed.'

# TODO(P2): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Every log line can be read by a program' 'Planned check; written when P2 starts.'
Add-TodoStep 'No crash entries' 'Planned check; written when P2 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P2'
