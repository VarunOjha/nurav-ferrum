#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p4.15 (P4 Security): Selectable isolation modes.  DRAFT: not ready until P4.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P4 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) The same two-site test per mode shows the expected separation; process counts
                   recorded; any mode that fails is recorded with its error.
  Why            : Isolation has a cost → three modes set in config (shared, a profile per site, a data
                   folder per site), observed rather than assumed → P6 can compare them.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p4.15-selectable-isolation-modes.ps1
  Result         : NOT READY = exit 2 until P4; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P4" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Integration test runs the same two-site fixture in each mode and asserts the expected storage
    separation (cookies, localStorage, IndexedDB); process inspection (ProcessInfosChanged / process-tree
    snapshot) records browser-process count per mode to raw/evidence/phase-p4-security/isolation-modes.md;
    mode switch takes effect after restart and is rejected for invalid values; any mode found infeasible
    is recorded as such with the observed error, not silently dropped. Modes provide
    cfg-ferrum-shared-profile, cfg-ferrum-profile-per-site and cfg-ferrum-udf-per-site for
    exp-isolation-overhead.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p4.15' -Title 'Selectable isolation modes' -Phase 'phase-p4-security' `
    -Why 'p6 can compare them.'

# TODO(P4): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'The same two-site test per mode shows the expected separation' 'Planned check; written when P4 starts.'
Add-TodoStep 'Process counts recorded' 'Planned check; written when P4 starts.'
Add-TodoStep 'Any mode that fails is recorded with its error' 'Planned check; written when P4 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P4'
