#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p2.2 (P2 First working app): Create the desktop app.  DRAFT: not ready until P2.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P2 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) Release build succeeds; the window shows the shell (screenshot saved).
  Why            : The design was fixed in P1 → create the app with the chosen Tauri version and hosting
                   route → the shell window opens.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p2.2-create-desktop-app.ps1
  Result         : NOT READY = exit 2 until P2; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P2" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Release build via the pinned Tauri CLI exits 0 (output saved); app window opens and shows the shell
    (owner or Claude observes; screenshot saved).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p2.2' -Title 'Create the desktop app' -Phase 'phase-p2-minimal-container' `
    -Why 'the shell window opens.'

# TODO(P2): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Release build succeeds' 'Planned check; written when P2 starts.'
Add-TodoStep 'The window shows the shell (screenshot saved)' 'Planned check; written when P2 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P2'
