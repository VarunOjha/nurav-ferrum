#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p2.3 (P2 First working app): Lock the bridge to the app.  DRAFT: not ready until P2.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P2 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) A test page tries app, plugin and event calls; every one is refused and
                   logged.
  Why            : Every web view can reach the app's command channel → grant permissions to the shell
                   only, none to websites → a website cannot control Ferrum.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p2.3-lock-bridge-app.ps1
  Result         : NOT READY = exit 2 until P2; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P2" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Integration test loads a fixture page in the content WebView that calls an app command, a core plugin
    command and event emit/listen through the IPC bridge; every call is rejected and the rejection is
    logged.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p2.3' -Title 'Lock the bridge to the app' -Phase 'phase-p2-minimal-container' `
    -Why 'a website cannot control Ferrum.'

# TODO(P2): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'A test page tries app, plugin and event calls' 'Planned check; written when P2 starts.'
Add-TodoStep 'Every one is refused and logged' 'Planned check; written when P2 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P2'
