#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.2 (P3 Tabs and sessions): One web view per tab.  DRAFT: not ready until P3.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P3 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) Open 20 tabs, switch, close all: view count back to zero, no leftover
                   processes.
  Why            : Each tab needs its own view → create views only from non-blocking code, hide and show
                   on switch, release fully on close → no freezes or leftover processes.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p3.2-view-per-tab.ps1
  Result         : NOT READY = exit 2 until P3; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P3" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Integration test opens 20 tabs, switches through all, closes all; WebView count returns to zero and no
    WebView2 process belonging to a closed profile remains (checked with the process-info API used in
    spike S3).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p3.2' -Title 'One web view per tab' -Phase 'phase-p3-tabs-sessions' `
    -Why 'no freezes or leftover processes.'

# TODO(P3): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Open 20 tabs, switch, close all: view count back to zero, no leftover processes' 'Planned check; written when P3 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P3'
