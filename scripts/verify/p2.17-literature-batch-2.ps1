#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p2.17 (P2 First working app): Literature batch 2.  DRAFT: not ready until P2.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P2 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) New dated notes; the reading log is updated; no unchecked citation.
  Why            : Research runs alongside code → read on WebView2 and Chromium processes, page lifecycle
                   and embedded-view resource studies → evidence for later experiments.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p2.17-literature-batch-2.ps1
  Result         : NOT READY until P2 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P2" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    New raw research notes with access dates; ov-research-literature-log (created in p1.14) updated; no
    unverified citation.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p2.17' -Title 'Literature batch 2' -Phase 'phase-p2-minimal-container' `
    -Why 'evidence for later experiments.'

# TODO(P2): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'New dated notes' 'Planned check; written when P2 starts.'
Add-TodoStep 'The reading log is updated' 'Planned check; written when P2 starts.'
Add-TodoStep 'No unchecked citation' 'Planned check; written when P2 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P2'
