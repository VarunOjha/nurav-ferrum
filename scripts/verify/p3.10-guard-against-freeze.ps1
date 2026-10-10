#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.10 (P3 Tabs and sessions): Guard against the freeze bug.  DRAFT: not ready until P3.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P3 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) A review checklist item plus a loop test that never hangs.
  Why            : Creating views from blocking code freezes on Windows → make that path impossible and
                   test it in a loop → the bug cannot come back.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p3.10-guard-against-freeze.ps1
  Result         : NOT READY = exit 2 until P3; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P3" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Code review checklist item plus a test that creates tabs from the shell's command path in a loop
    without hanging (test timeout).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p3.10' -Title 'Guard against the freeze bug' -Phase 'phase-p3-tabs-sessions' `
    -Why 'the bug cannot come back.'

# TODO(P3): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'A review checklist item plus a loop test that never hangs' 'Planned check; written when P3 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P3'
