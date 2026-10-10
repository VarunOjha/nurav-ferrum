#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p8.1 (P8 Research paper): Set up the paper project.  DRAFT: not ready until P8.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P8 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) The empty paper builds to a PDF with no errors; the tool version is recorded.
  Why            : We need a paper that builds from day one → set up the LaTeX project with the proposed
                   ACM template; Claude installs the tools and you click the admin prompt (who installs) →
                   writing can start any time.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p8.1-paper-project.ps1
  Result         : NOT READY until P8 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P8" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    latexmk (or the chosen build command) produces a PDF from the skeleton with zero errors; toolchain
    version recorded.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p8.1' -Title 'Set up the paper project' -Phase 'phase-p8-research-paper' `
    -Why 'writing can start any time.'

# TODO(P8): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'The empty paper builds to a PDF with no errors' 'Planned check; written when P8 starts.'
Add-TodoStep 'The tool version is recorded' 'Planned check; written when P8 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P8'
