#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.3 (P3 Tabs and sessions): Tab strip and shortcuts.  DRAFT: not ready until P3.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P3 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) Each shortcut works from the shell and from a tab; the bridge lockdown test
                   still passes.
  Why            : Shortcuts must work even while typing in a website → handle them in the shell without
                   giving websites access → fast and still safe.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p3.3-tab-strip-shortcuts.ps1
  Result         : NOT READY = exit 2 until P3; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P3" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Smoke tests send each shortcut with focus in the shell and with focus in a tab; the action happens;
    the p2.3 IPC denial test still passes.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p3.3' -Title 'Tab strip and shortcuts' -Phase 'phase-p3-tabs-sessions' `
    -Why 'fast and still safe.'

# TODO(P3): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Each shortcut works from the shell and from a tab' 'Planned check; written when P3 starts.'
Add-TodoStep 'The bridge lockdown test still passes' 'Planned check; written when P3 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P3'
