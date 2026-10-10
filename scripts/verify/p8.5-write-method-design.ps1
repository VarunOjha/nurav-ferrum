#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p8.5 (P8 Research paper): Write method and design sections.  DRAFT: not ready until P8.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P8 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) The sections build; every claim cites a source; you review them.
  Why            : Method and design do not depend on results → write method, architecture, tab-sleeping
                   design and background first → the paper moves on without waiting for data.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p8.5-write-method-design.ps1
  Result         : NOT READY until P8 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P8" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    Sections compile; every factual claim cites a wiki page, research note or reference; owner reviews.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p8.5' -Title 'Write method and design sections' -Phase 'phase-p8-research-paper' `
    -Why 'the paper moves on without waiting for data.'

# TODO(P8): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'The sections build' 'Planned check; written when P8 starts.'
Add-TodoStep 'Every claim cites a source' 'Planned check; written when P8 starts.'
Add-TodoStep 'You review them' 'Planned check; written when P8 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P8'
