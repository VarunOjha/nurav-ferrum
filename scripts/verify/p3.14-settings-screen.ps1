#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.14 (P3 Tabs and sessions): Settings screen.  DRAFT: not ready until P3.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P3 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) Changes persist and apply after restart; bad input is refused; websites
                   cannot call these commands.
  Why            : You need to change startup sites, profiles and the download folder → a settings screen
                   in the trusted shell, checked by the app → websites still cannot touch settings.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p3.14-settings-screen.ps1
  Result         : NOT READY = exit 2 until P3; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P3" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Integration test drives the settings UI host commands to change startup sites, a per-site setting and
    the download folder, restarts, and asserts the changes persisted and took effect; invalid input
    (non-existent folder, unparseable URL) is rejected with an error and leaves the file unchanged; the
    p2.3 IPC denial test shows remote tabs cannot invoke the settings commands; shell unit tests cover the
    settings view.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p3.14' -Title 'Settings screen' -Phase 'phase-p3-tabs-sessions' `
    -Why 'websites still cannot touch settings.'

# TODO(P3): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Changes persist and apply after restart' 'Planned check; written when P3 starts.'
Add-TodoStep 'Bad input is refused' 'Planned check; written when P3 starts.'
Add-TodoStep 'Websites cannot call these commands' 'Planned check; written when P3 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P3'
