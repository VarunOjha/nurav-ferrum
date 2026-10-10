#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p4.4 (P4 Security): Ask before opening other apps.  DRAFT: not ready until P4.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P4 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) Without consent the other program is never started.
  Why            : Links can launch other programs → confirm in the shell, with an allowlist per link type
                   → nothing launches silently.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p4.4-ask-before-opening.ps1
  Result         : NOT READY until P4 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P4" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    Security test: custom-scheme fixture triggers the confirmation; without consent the OS handler is
    never invoked (launcher mocked).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p4.4' -Title 'Ask before opening other apps' -Phase 'phase-p4-security' `
    -Why 'nothing launches silently.'

# TODO(P4): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Without consent the other program is never started' 'Planned check; written when P4 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P4'
