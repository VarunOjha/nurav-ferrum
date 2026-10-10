#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p2.15 (P2 First working app): Quick whole-app tests.  DRAFT: not ready until P2.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P2 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) The suite command passes; output saved.
  Why            : Features interact → one suite drives shell and website view (Playwright if experiment 4
                   passed, otherwise Rust tests plus a manual list) → one command shows the first
                   milestone works.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p2.15-quick-whole-app.ps1
  Result         : NOT READY = exit 2 until P2; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P2" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Smoke suite command exits 0; output saved as evidence.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p2.15' -Title 'Quick whole-app tests' -Phase 'phase-p2-minimal-container' `
    -Why 'one command shows the first milestone works.'

# TODO(P2): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'The suite command passes' 'Planned check; written when P2 starts.'
Add-TodoStep 'Output saved' 'Planned check; written when P2 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P2'
