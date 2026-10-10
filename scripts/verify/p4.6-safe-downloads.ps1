#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p4.6 (P4 Security): Safe downloads.  DRAFT: not ready until P4.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P4 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) Trick names and program files land cleaned in the folder, with a warning.
  Why            : Downloads can hide tricks → configured folder only, no auto-open, a warning for
                   programs, cleaned file names → no folder-escape tricks.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p4.6-safe-downloads.ps1
  Result         : NOT READY = exit 2 until P4; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P4" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Security tests with fixtures offering a path-traversal filename and an executable type: file lands
    sanitised in the configured folder and the warning shows.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p4.6' -Title 'Safe downloads' -Phase 'phase-p4-security' `
    -Why 'no folder-escape tricks.'

# TODO(P4): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Trick names and program files land cleaned in the folder, with a warning' 'Planned check; written when P4 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P4'
