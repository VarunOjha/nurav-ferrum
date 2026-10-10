#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p2.9 (P2 First working app): Follow redirects correctly.  DRAFT: not ready until P2.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P2 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) Each redirect test shows the final address; the loop test ends in an error.
  Why            : Sites redirect → show the final address and stop loops with an error → the address bar
                   never lies.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p2.9-follow-redirects-correctly.ps1
  Result         : NOT READY until P2 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P2" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    Smoke tests for each redirect fixture assert the final URL in the address bar; loop fixture ends in
    the error state.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p2.9' -Title 'Follow redirects correctly' -Phase 'phase-p2-minimal-container' `
    -Why 'the address bar never lies.'

# TODO(P2): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Each redirect test shows the final address' 'Planned check; written when P2 starts.'
Add-TodoStep 'The loop test ends in an error' 'Planned check; written when P2 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P2'
