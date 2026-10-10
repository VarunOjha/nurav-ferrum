#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p8.10 (P8 Research paper): Reproducibility package.  DRAFT: not ready until P8.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P8 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) A fresh copy rebuilds all figures from the archived data; the output is
                   saved.
  Why            : Others must be able to check our work → package the guide, scripts, setup records and
                   data (or an archive with checksums) with a data licence → anyone can rebuild every
                   figure.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p8.10-reproducibility-package.ps1
  Result         : NOT READY = exit 2 until P8; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P8" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    A fresh-checkout dry run regenerates all figures from the archived raw data (owner or Claude), output
    saved.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p8.10' -Title 'Reproducibility package' -Phase 'phase-p8-research-paper' `
    -Why 'anyone can rebuild every figure.'

# TODO(P8): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'A fresh copy rebuilds all figures from the archived data' 'Planned check; written when P8 starts.'
Add-TodoStep 'The output is saved' 'Planned check; written when P8 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P8'
