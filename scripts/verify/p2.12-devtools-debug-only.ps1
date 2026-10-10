#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p2.12 (P2 First working app): Developer tools only in test builds.  DRAFT: not ready until P2.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P2 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) The release build cannot open them; the debug build can.
  Why            : Developer tools expose page internals → enable them only in debug builds → the release
                   app stays locked.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p2.12-devtools-debug-only.ps1
  Result         : NOT READY until P2 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P2" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    Test or scripted check: release build has DevTools disabled (opening attempt has no effect); debug
    build can open them.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p2.12' -Title 'Developer tools only in test builds' -Phase 'phase-p2-minimal-container' `
    -Why 'the release app stays locked.'

# TODO(P2): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'The release build cannot open them' 'Planned check; written when P2 starts.'
Add-TodoStep 'The debug build can' 'Planned check; written when P2 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P2'
