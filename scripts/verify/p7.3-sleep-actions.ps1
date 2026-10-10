#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p7.3 (P7 Smart tab sleeping): Sleep actions: hide, suspend, close, restore.  DRAFT: not ready until P7.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P7 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) Tests confirm the web view's state after each action and that restore returns
                   to the same page.
  Why            : Sleeping has levels → build hide, suspend, low-memory mode and close-but-remember
                   (address, history, scroll position), plus restore → each strategy can pick the right
                   level.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p7.3-sleep-actions.ps1
  Result         : NOT READY until P7 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P7" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    Integration tests per mechanism assert the WebView2 state after the call (IsSuspended, level, WebView
    closed) and that restore returns to the same URL; unsafe invariants documented.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p7.3' -Title 'Sleep actions: hide, suspend, close, restore' -Phase 'phase-p7-lifecycle' `
    -Why 'each strategy can pick the right level.'

# TODO(P7): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Tests confirm the web view''s state after each action and that restore returns to the same page' 'Planned check; written when P7 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P7'
