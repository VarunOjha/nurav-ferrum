#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p4.9 (P4 Security): Security audit log.  DRAFT: not ready until P4.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P4 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) Each security test finds its record; all records match the format.
  Why            : Denials need a record → one log line per denied action, old logs rolled over, with no
                   page content → evidence without privacy leaks.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p4.9-security-audit-log.ps1
  Result         : NOT READY = exit 2 until P4; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P4" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Every security test asserts its matching audit record exists; a schema test validates all records.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p4.9' -Title 'Security audit log' -Phase 'phase-p4-security' `
    -Why 'evidence without privacy leaks.'

# TODO(P4): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Each security test finds its record' 'Planned check; written when P4 starts.'
Add-TodoStep 'All records match the format' 'Planned check; written when P4 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P4'
