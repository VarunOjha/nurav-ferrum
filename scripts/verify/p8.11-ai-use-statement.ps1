#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p8.11 (P8 Research paper): AI-use statement.  DRAFT: not ready until P8.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P8 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) You review and approve it.
  Why            : Venues require disclosure of AI help → finish the AI-use statement to match the chosen
                   venue's policy, with the human authors' responsibility → honest and compliant.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p8.11-ai-use-statement.ps1
  Result         : NOT READY until P8 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P8" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    Owner reviews and approves AI_USAGE.md.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p8.11' -Title 'AI-use statement' -Phase 'phase-p8-research-paper' `
    -Why 'honest and compliant.'

# TODO(P8): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'You review and approve it' 'Planned check; written when P8 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P8'
