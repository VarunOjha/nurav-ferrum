#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.15 (P3 Tabs and sessions): Sidebar of tabs and history.  DRAFT: not ready until P3.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P3 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) Toggling the sidebar resizes the tab view with no overlap; choosing an entry
                   opens it.
  Why            : Website views are always drawn over the shell → place the sidebar beside them, never on
                   top → nothing is hidden or overlapped.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p3.15-sidebar-tabs-history.ps1
  Result         : NOT READY = exit 2 until P3; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P3" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Smoke test toggles the sidebar and asserts the active tab's WebView bounds shrink and grow so the two
    never overlap; selecting a tab or history entry in the sidebar activates or navigates it; keyboard
    toggle works with focus in a tab; shell unit tests cover the sidebar component.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p3.15' -Title 'Sidebar of tabs and history' -Phase 'phase-p3-tabs-sessions' `
    -Why 'nothing is hidden or overlapped.'

# TODO(P3): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Toggling the sidebar resizes the tab view with no overlap' 'Planned check; written when P3 starts.'
Add-TodoStep 'Choosing an entry opens it' 'Planned check; written when P3 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P3'
