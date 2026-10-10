#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p5.14 (P5 Measurement): Gate and your review.  DRAFT: not ready until P5.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P5 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) All evidence files exist, the wiki check is clean, and you approve the end of
                   P5.
  Why            : All tasks done → the gate script runs every check and saves the evidence → you review
                   the accuracy results and the privacy check and approve; only then does P6 start.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p5.14-gate-review.ps1
  Result         : NOT READY = exit 2 until P5; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P5" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    All evidence files exist; lint clean; owner approves phase-p5-telemetry#exit.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p5.14' -Title 'Gate and your review' -Phase 'phase-p5-telemetry' `
    -Why 'you review the accuracy results and the privacy check and approve; only then does P6 start.'

# TODO(P5): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'All evidence files exist, the wiki check is clean, and you approve the end of P5' 'Planned check; written when P5 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P5'
